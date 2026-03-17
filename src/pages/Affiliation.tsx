import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, ShoppingCart, DollarSign, Clock, CheckCircle, Edit2, Save, X, Eye, Filter } from "lucide-react";
import { collection, getDocs, query, where, updateDoc, doc, getDoc, setDoc } from "firebase/firestore";
import AppContext from "../context/AppContext";
import { useToast } from "@/hooks/use-toast";

export default function Affiliation() {
  const { db, globalState } = useContext(AppContext);
  const { toast } = useToast();

  const [globalCommissionRate, setGlobalCommissionRate] = useState(10);
  const [isEditingRate, setIsEditingRate] = useState(false);
  const [tempRate, setTempRate] = useState(10);
  const [affiliates, setAffiliates] = useState([]);
  const [selectedAffiliate, setSelectedAffiliate] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [processingPayment, setProcessingPayment] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  const [stats, setStats] = useState({
    totalAffiliates: 0,
    totalSales: 0,
    totalRevenue: 0,
    totalCommissionPaid: 0,
    totalCommissionPending: 0,
  });

  useEffect(() => {
    if (db) {
      fetchAffiliationData();
      fetchCommissionRate();
    }
  }, [db]);

  const fetchCommissionRate = async () => {
    try {
      const configDoc = await getDoc(doc(db, 'Config', 'affiliateSettings'));
      if (configDoc.exists()) {
        const rate = configDoc.data().commissionRate || 10;
        setGlobalCommissionRate(rate);
        setTempRate(rate);
      }
    } catch (error) {
      console.error('Error fetching commission rate:', error);
    }
  };

  const updateCommissionRate = async () => {
    try {
      await setDoc(doc(db, 'Config', 'affiliateSettings'), {
        commissionRate: tempRate,
        updatedAt: new Date().toISOString(),
      });
      setGlobalCommissionRate(tempRate);
      setIsEditingRate(false);
      toast({
        title: "Commission Rate Updated",
        description: `New commission rate: ${tempRate}%`,
      });
    } catch (error) {
      console.error('Error updating commission rate:', error);
      toast({
        title: "Error",
        description: "Failed to update commission rate",
        variant: "destructive",
      });
    }
  };

  const fetchAffiliationData = async () => {
    try {
      const usersSnapshot = await getDocs(
        query(collection(db, 'Users'), where('IsAffiliate', '==', true))
      );

      const historySnapshot = await getDocs(collection(db, 'AffiliateHistory'));

      const affiliateData = new Map();
      let globalStats = {
        totalAffiliates: usersSnapshot.size,
        totalSales: 0,
        totalRevenue: 0,
        totalCommissionPaid: 0,
        totalCommissionPending: 0,
      };

      usersSnapshot.forEach((userDoc) => {
        const userData = userDoc.data();
        if (userData.AffiliateId) {
          affiliateData.set(userData.AffiliateId, {
            id: userData.AffiliateId,
            name: userData.Name || 'Unknown',
            email: userData.UserID || userData.Email || '',
            address: userData.Address || '',
            city: userData.City || '',
            country: userData.Country || '',
            phone: userData.Phone || '',
            sales: [],
            totalSales: 0,
            totalRevenue: 0,
            commissionPaid: 0,
            commissionPending: 0,
            totalCommission: 0,
          });
        }
      });

      historySnapshot.forEach((historyDoc) => {
        const data = historyDoc.data();
        const affiliateId = data.AffiliateID;

        if (!affiliateId) return;

        if (!affiliateData.has(affiliateId)) {
          affiliateData.set(affiliateId, {
            id: affiliateId,
            name: 'Deleted User',
            email: data.UserID || '',
            address: '',
            city: '',
            country: '',
            phone: '',
            sales: [],
            totalSales: 0,
            totalRevenue: 0,
            commissionPaid: 0,
            commissionPending: 0,
            totalCommission: 0,
          });
        }

        const affiliate = affiliateData.get(affiliateId);
        
        const revenue = typeof data.Total === 'string' ? parseFloat(data.Total) : (data.Total || 0);
        const commission = data.Commission || 0;
        const isPaid = data.Status === 'paid';

        affiliate.sales.push({
          id: historyDoc.id,
          orderId: data.OrderID,
          date: data.PurchaseDate,
          revenue: revenue,
          commission: commission,
          status: data.Status || 'pending',
          products: data.Products || [],
          userEmail: data.UserID || '',
        });

        affiliate.totalSales += 1;
        affiliate.totalRevenue += revenue;
        affiliate.totalCommission += commission;

        if (isPaid) {
          affiliate.commissionPaid += commission;
          globalStats.totalCommissionPaid += commission;
        } else {
          affiliate.commissionPending += commission;
          globalStats.totalCommissionPending += commission;
        }

        globalStats.totalSales += 1;
        globalStats.totalRevenue += revenue;
      });

      setStats(globalStats);
      setAffiliates(Array.from(affiliateData.values()).sort((a, b) => b.totalRevenue - a.totalRevenue));
    } catch (error) {
      console.error('Error fetching affiliation data:', error);
      toast({
        title: "Error",
        description: "Failed to load affiliation data",
        variant: "destructive",
      });
    }
  };

  const handlePayCommission = async (affiliateId, saleId) => {
    setProcessingPayment(saleId);
    try {
      await updateDoc(doc(db, 'AffiliateHistory', saleId), {
        Status: 'paid',
        PaidAt: new Date().toISOString(),
      });

      await fetchAffiliationData();
      toast({
        title: "Payment Processed",
        description: "Commission marked as paid successfully",
      });
    } catch (error) {
      console.error('Error updating payment status:', error);
      toast({
        title: "Error",
        description: "Failed to process payment",
        variant: "destructive",
      });
    } finally {
      setProcessingPayment(null);
    }
  };

  const handlePayAllPending = async (affiliateId) => {
    const affiliate = affiliates.find(a => a.id === affiliateId);
    if (!affiliate) return;

    const pendingSales = affiliate.sales.filter(s => s.status === 'pending');
    if (pendingSales.length === 0) {
      toast({
        title: "No Pending Payments",
        description: "This affiliate has no pending commissions",
      });
      return;
    }

    try {
      const updatePromises = pendingSales.map(sale =>
        updateDoc(doc(db, 'AffiliateHistory', sale.id), {
          Status: 'paid',
          PaidAt: new Date().toISOString(),
        })
      );

      await Promise.all(updatePromises);
      await fetchAffiliationData();
      
      toast({
        title: "All Payments Processed",
        description: `Paid R${affiliate.commissionPending.toFixed(2)} to ${affiliate.name}`,
      });
    } catch (error) {
      console.error('Error paying all commissions:', error);
      toast({
        title: "Error",
        description: "Failed to process all payments",
        variant: "destructive",
      });
    }
  };

  const viewAffiliateDetails = (affiliate) => {
    setSelectedAffiliate(affiliate);
    setShowDetailsModal(true);
  };

  const getFilteredSales = (sales) => {
    if (filterStatus === 'all') return sales;
    return sales.filter(s => s.status === filterStatus);
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Affiliate Management</h1>
        
        <div className="flex items-center gap-3 bg-white p-4 rounded-lg shadow-sm border w-full md:w-auto">
          <span className="text-sm font-medium text-gray-600">Global Commission:</span>
          {isEditingRate ? (
            <div className="flex items-center gap-2">
              <Input
                type="number"
                value={tempRate}
                onChange={(e) => setTempRate(Number(e.target.value))}
                className="w-20 px-2 py-1"
                min="0"
                max="100"
              />
              <span className="text-lg font-bold">%</span>
              <Button
                onClick={updateCommissionRate}
                size="sm"
                className="bg-green-500 hover:bg-green-600"
              >
                <Save className="w-4 h-4" />
              </Button>
              <Button
                onClick={() => {
                  setTempRate(globalCommissionRate);
                  setIsEditingRate(false);
                }}
                size="sm"
                variant="secondary"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-blue-600">{globalCommissionRate}%</span>
              <Button
                onClick={() => setIsEditingRate(true)}
                size="sm"
                className="bg-blue-500 hover:bg-blue-600"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Affiliates</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalAffiliates}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Total Sales</CardTitle>
            <ShoppingCart className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSales}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Revenue Generated</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R{stats.totalRevenue.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Commission Paid</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">R{stats.totalCommissionPaid.toFixed(2)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Commission Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">R{stats.totalCommissionPending.toFixed(2)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">Affiliate Performance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Affiliate</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sales</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Commission</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Paid</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Pending</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {affiliates.map((affiliate) => (
                  <tr key={affiliate.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="font-medium text-gray-900">{affiliate.name}</div>
                        <div className="text-sm text-gray-500">{affiliate.email}</div>
                        <div className="text-xs text-gray-400">ID: {affiliate.id}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <ShoppingCart className="w-4 h-4 text-purple-600" />
                        <span className="font-semibold">{affiliate.totalSales}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-semibold text-green-600">R{affiliate.totalRevenue.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-bold text-blue-600">R{affiliate.totalCommission.toFixed(2)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-600 font-semibold">R{affiliate.commissionPaid.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-yellow-600" />
                        <span className="text-yellow-600 font-semibold">R{affiliate.commissionPending.toFixed(2)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button
                          onClick={() => viewAffiliateDetails(affiliate)}
                          size="sm"
                          className="bg-blue-500 hover:bg-blue-600"
                        >
                          <Eye className="w-4 h-4 mr-1" />
                          View
                        </Button>
                        {affiliate.commissionPending > 0 && (
                          <Button
                            onClick={() => handlePayAllPending(affiliate.id)}
                            size="sm"
                            className="bg-green-500 hover:bg-green-600"
                          >
                            <DollarSign className="w-4 h-4 mr-1" />
                            Pay All
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {affiliates.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No affiliates found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {showDetailsModal && selectedAffiliate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">{selectedAffiliate.name}</h3>
                <p className="text-sm text-gray-500">{selectedAffiliate.email}</p>
                {selectedAffiliate.phone && (
                  <p className="text-sm text-gray-500">{selectedAffiliate.phone}</p>
                )}
                {selectedAffiliate.address && (
                  <p className="text-sm text-gray-500">
                    {selectedAffiliate.address}, {selectedAffiliate.city}, {selectedAffiliate.country}
                  </p>
                )}
              </div>
              <Button onClick={() => setShowDetailsModal(false)} variant="ghost" size="sm">
                <X className="w-6 h-6" />
              </Button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-purple-50 p-4 rounded-lg">
                  <div className="text-sm text-purple-600 mb-1">Total Sales</div>
                  <div className="text-2xl font-bold">{selectedAffiliate.totalSales}</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-sm text-green-600 mb-1">Revenue</div>
                  <div className="text-2xl font-bold">R{selectedAffiliate.totalRevenue.toFixed(2)}</div>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-blue-600 mb-1">Total Commission</div>
                  <div className="text-2xl font-bold">R{selectedAffiliate.totalCommission.toFixed(2)}</div>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <div className="text-sm text-yellow-600 mb-1">Pending</div>
                  <div className="text-2xl font-bold">R{selectedAffiliate.commissionPending.toFixed(2)}</div>
                </div>
              </div>

              <div className="flex gap-2 mb-4">
                <Button
                  onClick={() => setFilterStatus('all')}
                  variant={filterStatus === 'all' ? 'default' : 'outline'}
                  size="sm"
                >
                  All ({selectedAffiliate.sales.length})
                </Button>
                <Button
                  onClick={() => setFilterStatus('pending')}
                  variant={filterStatus === 'pending' ? 'default' : 'outline'}
                  size="sm"
                  className={filterStatus === 'pending' ? 'bg-yellow-600 hover:bg-yellow-700' : ''}
                >
                  Pending ({selectedAffiliate.sales.filter(s => s.status === 'pending').length})
                </Button>
                <Button
                  onClick={() => setFilterStatus('paid')}
                  variant={filterStatus === 'paid' ? 'default' : 'outline'}
                  size="sm"
                  className={filterStatus === 'paid' ? 'bg-green-600 hover:bg-green-700' : ''}
                >
                  Paid ({selectedAffiliate.sales.filter(s => s.status === 'paid').length})
                </Button>
              </div>

              <h4 className="text-lg font-bold mb-4">Sales History</h4>
              <div className="space-y-3">
                {getFilteredSales(selectedAffiliate.sales).map((sale) => (
                  <div key={sale.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-medium">Order #{sale.orderId?.slice(0, 8) || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{sale.date}</div>
                        <div className="text-sm text-gray-500">Customer: {sale.userEmail}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-lg">R{sale.revenue.toFixed(2)}</div>
                        <div className="text-sm text-blue-600 font-semibold">Commission: R{sale.commission.toFixed(2)}</div>
                      </div>
                    </div>

                    {sale.products && sale.products.length > 0 && (
                      <div className="mb-3 border-t pt-3">
                        <p className="text-sm font-medium mb-2">Products:</p>
                        <div className="space-y-1">
                          {sale.products.map((product, idx) => (
                            <div key={idx} className="text-sm text-gray-600 flex justify-between">
                              <span>{product.ProductName} x{product.Quantity}</span>
                              <span>R{(product.Price * product.Quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t">
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        sale.status === 'paid' 
                          ? 'bg-green-100 text-green-700' 
                          : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {sale.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>

                      {sale.status === 'pending' && (
                        <Button
                          onClick={() => handlePayCommission(selectedAffiliate.id, sale.id)}
                          disabled={processingPayment === sale.id}
                          size="sm"
                          className="bg-green-500 hover:bg-green-600"
                        >
                          <DollarSign className="w-4 h-4 mr-1" />
                          {processingPayment === sale.id ? 'Processing...' : 'Mark as Paid'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}

                {getFilteredSales(selectedAffiliate.sales).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p>No {filterStatus !== 'all' ? filterStatus : ''} sales found</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}