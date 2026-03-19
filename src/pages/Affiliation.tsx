import React, { useState, useEffect, useContext, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Users, ShoppingCart, DollarSign, Clock, CheckCircle,
  Edit2, Save, X, Eye, RefreshCw, Loader2,
} from "lucide-react";
import {
  collection, getDocs, query, where,
  updateDoc, doc, getDoc, setDoc, addDoc, serverTimestamp,
} from "firebase/firestore";
import emailjs from '@emailjs/browser';
import AppContext from "../context/AppContext";
import { useToast } from "@/hooks/use-toast";

// ─── EmailJS Config ───────────────────────────────────────────────────────────
const EMAILJS_SERVICE_ID  = 'YOUR_SERVICE_ID';
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
const EMAILJS_PUBLIC_KEY  = 'YOUR_PUBLIC_KEY';

export default function Affiliation() {
  const { db } = useContext(AppContext);
  const { toast } = useToast();

  const [globalCommissionRate, setGlobalCommissionRate] = useState(10);
  const [isEditingRate, setIsEditingRate]               = useState(false);
  const [tempRate, setTempRate]                         = useState(10);
  const [affiliates, setAffiliates]                     = useState([]);
  const [selectedAffiliate, setSelectedAffiliate]       = useState(null);
  const [showDetailsModal, setShowDetailsModal]         = useState(false);
  const [processingPayment, setProcessingPayment]       = useState(null);
  const [filterStatus, setFilterStatus]                 = useState('all');
  const [isLoading, setIsLoading]                       = useState(true);
  const [isRefreshing, setIsRefreshing]                 = useState(false);

  const [stats, setStats] = useState({
    totalAffiliates: 0, totalSales: 0, totalRevenue: 0,
    totalCommissionPaid: 0, totalCommissionPending: 0,
  });

  // ─── Fetch commission rate ────────────────────────────────────────────────
  const fetchCommissionRate = useCallback(async () => {
    try {
      const configDoc = await getDoc(doc(db, 'StoreConfigs', 'StoreConfig001'));
      if (configDoc.exists()) {
        const rate = configDoc.data()?.AffiliationCustomization?.commissionRate ?? 10;
        setGlobalCommissionRate(rate);
        setTempRate(rate);
      }
    } catch (error) {
      console.error('Error fetching commission rate:', error);
    }
  }, [db]);

  const updateCommissionRate = async () => {
    try {
      await setDoc(
        doc(db, 'StoreConfigs', 'StoreConfig001'),
        { AffiliationCustomization: { commissionRate: tempRate, updatedAt: new Date().toISOString() } },
        { merge: true }
      );
      setGlobalCommissionRate(tempRate);
      setIsEditingRate(false);
      toast({ title: "Commission Rate Updated", description: `New global commission rate: ${tempRate}%` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to update commission rate", variant: "destructive" });
    }
  };

  // ─── Fetch affiliation data ───────────────────────────────────────────────
  const fetchAffiliationData = useCallback(async (silent = false) => {
    if (!db) return;
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      const [usersSnapshot, historySnapshot] = await Promise.all([
        getDocs(query(collection(db, 'Users'), where('IsAffiliate', '==', true))),
        getDocs(collection(db, 'AffiliateHistory')),
      ]);

      const affiliateData = new Map();
      const globalStats = {
        totalAffiliates: usersSnapshot.size,
        totalSales: 0, totalRevenue: 0,
        totalCommissionPaid: 0, totalCommissionPending: 0,
      };

      usersSnapshot.forEach((userDoc) => {
        const d = userDoc.data();
        if (d.AffiliateId) {
          affiliateData.set(d.AffiliateId, {
            id: d.AffiliateId, userId: userDoc.id,
            name: d.Name || 'Unknown',
            email: d.UserID || d.Email || '',
            address: d.Address || '', city: d.City || '',
            country: d.Country || '', phone: d.Phone || '',
            sales: [], totalSales: 0, totalRevenue: 0,
            commissionPaid: 0, commissionPending: 0, totalCommission: 0,
          });
        }
      });

      historySnapshot.forEach((historyDoc) => {
        const data = historyDoc.data();
        const affiliateId = data.AffiliateID;
        if (!affiliateId) return;

        if (!affiliateData.has(affiliateId)) {
          affiliateData.set(affiliateId, {
            id: affiliateId, userId: null, name: 'Deleted User',
            email: data.UserID || '', address: '', city: '', country: '', phone: '',
            sales: [], totalSales: 0, totalRevenue: 0,
            commissionPaid: 0, commissionPending: 0, totalCommission: 0,
          });
        }

        const affiliate = affiliateData.get(affiliateId);
        const revenue   = typeof data.Total === 'string' ? parseFloat(data.Total) : (data.Total || 0);
        const commission = data.Commission || 0;
        const isPaid     = data.Status === 'paid';

        affiliate.sales.push({
          id: historyDoc.id, orderId: data.OrderID, date: data.PurchaseDate,
          revenue, commission, status: data.Status || 'pending',
          products: data.Products || [], userEmail: data.UserID || '',
        });

        affiliate.totalSales    += 1;
        affiliate.totalRevenue  += revenue;
        affiliate.totalCommission += commission;
        if (isPaid) {
          affiliate.commissionPaid    += commission;
          globalStats.totalCommissionPaid += commission;
        } else {
          affiliate.commissionPending    += commission;
          globalStats.totalCommissionPending += commission;
        }
        globalStats.totalSales   += 1;
        globalStats.totalRevenue += revenue;
      });

      const sorted = Array.from(affiliateData.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
      setStats(globalStats);
      setAffiliates(sorted);

      // Keep modal in sync if open
      if (selectedAffiliate) {
        const updated = sorted.find(a => a.id === selectedAffiliate.id);
        if (updated) setSelectedAffiliate(updated);
      }
    } catch (error) {
      console.error('Error fetching affiliation data:', error);
      toast({ title: "Error", description: "Failed to load affiliation data", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [db, selectedAffiliate]);

  useEffect(() => {
    if (db) {
      fetchAffiliationData();
      fetchCommissionRate();
    }
  }, [db]);

  // ─── Refresh handler ──────────────────────────────────────────────────────
  const handleRefresh = async () => {
    await Promise.all([fetchAffiliationData(true), fetchCommissionRate()]);
    toast({ title: "Refreshed", description: "Affiliation data is up to date." });
  };

  // ─── Notifications + email ────────────────────────────────────────────────
  const sendPaymentNotification = async (affiliate, amount, saleIds) => {
    try {
      if (affiliate.userId) {
        await addDoc(collection(db, 'Notifications'), {
          userId: affiliate.userId, affiliateId: affiliate.id,
          type: 'commission_paid',
          title: 'Commission Payment Received! 🎉',
          message: `Your commission of R${amount.toFixed(2)} has been marked as paid.`,
          amount, saleIds, read: false, createdAt: serverTimestamp(),
        });
      }
      if (affiliate.email) {
        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
          to_email: affiliate.email, to_name: affiliate.name,
          amount: `R${amount.toFixed(2)}`,
        }, EMAILJS_PUBLIC_KEY);
      }
    } catch (error) {
      console.error('Notification/email error:', error);
    }
  };

  // ─── Pay handlers ─────────────────────────────────────────────────────────
  const handlePayCommission = async (affiliate, saleId, saleCommission) => {
    setProcessingPayment(saleId);
    try {
      await updateDoc(doc(db, 'AffiliateHistory', saleId), {
        Status: 'paid', PaidAt: new Date().toISOString(),
      });
      await sendPaymentNotification(affiliate, saleCommission, [saleId]);
      await fetchAffiliationData(true);
      toast({ title: "Payment Processed", description: "Commission marked as paid." });
    } catch (error) {
      toast({ title: "Error", description: "Failed to process payment", variant: "destructive" });
    } finally {
      setProcessingPayment(null);
    }
  };

  const handlePayAllPending = async (affiliateId) => {
    const affiliate = affiliates.find(a => a.id === affiliateId);
    if (!affiliate) return;
    const pendingSales = affiliate.sales.filter(s => s.status === 'pending');
    if (!pendingSales.length) {
      toast({ title: "No Pending Payments" });
      return;
    }
    try {
      await Promise.all(pendingSales.map(sale =>
        updateDoc(doc(db, 'AffiliateHistory', sale.id), { Status: 'paid', PaidAt: new Date().toISOString() })
      ));
      const totalPaid = pendingSales.reduce((sum, s) => sum + s.commission, 0);
      await sendPaymentNotification(affiliate, totalPaid, pendingSales.map(s => s.id));
      await fetchAffiliationData(true);
      toast({ title: "All Payments Processed", description: `Paid R${totalPaid.toFixed(2)} to ${affiliate.name}` });
    } catch (error) {
      toast({ title: "Error", description: "Failed to process all payments", variant: "destructive" });
    }
  };

  const getFilteredSales = (sales) =>
    filterStatus === 'all' ? sales : sales.filter(s => s.status === filterStatus);

  // ─── Loading state ────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-500 mx-auto mb-3" />
          <p className="text-slate-500">Loading affiliation data...</p>
        </div>
      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Affiliate Management</h1>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full sm:w-auto">
          {/* Refresh button */}
          <Button variant="outline" onClick={handleRefresh} disabled={isRefreshing}
            className="gap-2 w-full sm:w-auto">
            {isRefreshing
              ? <Loader2 className="w-4 h-4 animate-spin" />
              : <RefreshCw className="w-4 h-4" />}
            {isRefreshing ? 'Refreshing...' : 'Refresh'}
          </Button>

          {/* Commission rate editor */}
          <div className="flex items-center gap-3 bg-white p-3 sm:p-4 rounded-lg shadow-sm border w-full sm:w-auto">
            <span className="text-sm font-medium text-gray-600 whitespace-nowrap">Commission:</span>
            {isEditingRate ? (
              <div className="flex items-center gap-2">
                <Input type="number" value={tempRate} onChange={e => setTempRate(Number(e.target.value))}
                  className="w-16 px-2 py-1 h-8" min="0" max="100" />
                <span className="font-bold">%</span>
                <Button onClick={updateCommissionRate} size="sm" className="bg-green-500 hover:bg-green-600 h-8 w-8 p-0">
                  <Save className="w-3.5 h-3.5" />
                </Button>
                <Button onClick={() => { setTempRate(globalCommissionRate); setIsEditingRate(false); }}
                  size="sm" variant="secondary" className="h-8 w-8 p-0">
                  <X className="w-3.5 h-3.5" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-blue-600">{globalCommissionRate}%</span>
                <Button onClick={() => setIsEditingRate(true)} size="sm" className="bg-blue-500 hover:bg-blue-600 h-8 w-8 p-0">
                  <Edit2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 md:gap-4">
        {[
          { label: 'Total Affiliates', value: stats.totalAffiliates, icon: <Users className="h-4 w-4 text-blue-600" />, color: '' },
          { label: 'Total Sales', value: stats.totalSales, icon: <ShoppingCart className="h-4 w-4 text-purple-600" />, color: '' },
          { label: 'Revenue', value: `R${stats.totalRevenue.toFixed(2)}`, icon: <DollarSign className="h-4 w-4 text-green-600" />, color: '' },
          { label: 'Commission Paid', value: `R${stats.totalCommissionPaid.toFixed(2)}`, icon: <CheckCircle className="h-4 w-4 text-green-600" />, color: 'text-green-600' },
          { label: 'Pending', value: `R${stats.totalCommissionPending.toFixed(2)}`, icon: <Clock className="h-4 w-4 text-yellow-600" />, color: 'text-yellow-600' },
        ].map(({ label, value, icon, color }) => (
          <Card key={label} className="col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-1 pt-3 px-3 md:px-4 md:pt-4">
              <CardTitle className="text-xs md:text-sm font-medium leading-tight">{label}</CardTitle>
              {icon}
            </CardHeader>
            <CardContent className="px-3 pb-3 md:px-4 md:pb-4">
              <div className={`text-lg md:text-2xl font-bold truncate ${color}`}>{value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-lg md:text-xl">Affiliate Performance</CardTitle>
          {isRefreshing && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Affiliate', 'Sales', 'Revenue', 'Commission', 'Paid', 'Pending', 'Actions'].map(h => (
                    <th key={h} className="px-3 md:px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {affiliates.map((affiliate) => (
                  <tr key={affiliate.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-3 md:px-4 py-3">
                      <div className="font-medium text-gray-900 text-sm">{affiliate.name}</div>
                      <div className="text-xs text-gray-500 truncate max-w-[140px]">{affiliate.email}</div>
                      <div className="text-xs text-gray-400">ID: {affiliate.id?.slice(0, 8)}</div>
                    </td>
                    <td className="px-3 md:px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <ShoppingCart className="w-3.5 h-3.5 text-purple-600" />
                        <span className="font-semibold text-sm">{affiliate.totalSales}</span>
                      </div>
                    </td>
                    <td className="px-3 md:px-4 py-3">
                      <span className="font-semibold text-green-600 text-sm">R{affiliate.totalRevenue.toFixed(2)}</span>
                    </td>
                    <td className="px-3 md:px-4 py-3">
                      <span className="font-bold text-blue-600 text-sm">R{affiliate.totalCommission.toFixed(2)}</span>
                    </td>
                    <td className="px-3 md:px-4 py-3">
                      <span className="text-green-600 font-semibold text-sm">R{affiliate.commissionPaid.toFixed(2)}</span>
                    </td>
                    <td className="px-3 md:px-4 py-3">
                      <span className="text-yellow-600 font-semibold text-sm">R{affiliate.commissionPending.toFixed(2)}</span>
                    </td>
                    <td className="px-3 md:px-4 py-3">
                      <div className="flex flex-col sm:flex-row gap-1.5">
                        <Button onClick={() => { setSelectedAffiliate(affiliate); setFilterStatus('all'); setShowDetailsModal(true); }}
                          size="sm" className="bg-blue-500 hover:bg-blue-600 text-xs h-7 px-2">
                          <Eye className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline">View</span>
                        </Button>
                        {affiliate.commissionPending > 0 && (
                          <Button onClick={() => handlePayAllPending(affiliate.id)}
                            size="sm" className="bg-green-500 hover:bg-green-600 text-xs h-7 px-2">
                            <DollarSign className="w-3.5 h-3.5 sm:mr-1" /><span className="hidden sm:inline">Pay All</span>
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

      {/* Detail Modal */}
      {showDetailsModal && selectedAffiliate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowDetailsModal(false)}>
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-4xl max-h-[92vh] sm:max-h-[90vh] overflow-hidden flex flex-col"
            onClick={e => e.stopPropagation()}>

            {/* Modal header */}
            <div className="sticky top-0 bg-white border-b px-4 sm:px-6 py-4 flex justify-between items-start flex-shrink-0">
              <div className="min-w-0 flex-1 pr-4">
                <h3 className="text-lg sm:text-xl font-bold truncate">{selectedAffiliate.name}</h3>
                <p className="text-sm text-gray-500 truncate">{selectedAffiliate.email}</p>
                {selectedAffiliate.phone && <p className="text-sm text-gray-500">{selectedAffiliate.phone}</p>}
                {selectedAffiliate.address && (
                  <p className="text-xs text-gray-400">{selectedAffiliate.address}, {selectedAffiliate.city}, {selectedAffiliate.country}</p>
                )}
              </div>
              <Button onClick={() => setShowDetailsModal(false)} variant="ghost" size="sm" className="flex-shrink-0">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Modal body */}
            <div className="p-4 sm:p-6 overflow-y-auto flex-1">

              {/* Mini stats */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {[
                  { label: 'Total Sales', value: selectedAffiliate.totalSales, bg: 'bg-purple-50', color: 'text-purple-600' },
                  { label: 'Revenue', value: `R${selectedAffiliate.totalRevenue.toFixed(2)}`, bg: 'bg-green-50', color: 'text-green-600' },
                  { label: 'Total Commission', value: `R${selectedAffiliate.totalCommission.toFixed(2)}`, bg: 'bg-blue-50', color: 'text-blue-600' },
                  { label: 'Pending', value: `R${selectedAffiliate.commissionPending.toFixed(2)}`, bg: 'bg-yellow-50', color: 'text-yellow-600' },
                ].map(({ label, value, bg, color }) => (
                  <div key={label} className={`${bg} p-3 sm:p-4 rounded-xl`}>
                    <div className={`text-xs ${color} mb-1 font-medium`}>{label}</div>
                    <div className="text-lg sm:text-2xl font-bold truncate">{value}</div>
                  </div>
                ))}
              </div>

              {selectedAffiliate.commissionPending > 0 && (
                <div className="mb-4 flex justify-end">
                  <Button onClick={() => handlePayAllPending(selectedAffiliate.id)}
                    className="bg-green-500 hover:bg-green-600 w-full sm:w-auto">
                    <DollarSign className="w-4 h-4 mr-2" />
                    Pay All Pending (R{selectedAffiliate.commissionPending.toFixed(2)})
                  </Button>
                </div>
              )}

              {/* Filter tabs */}
              <div className="flex gap-2 mb-4 flex-wrap">
                {[
                  { key: 'all', label: `All (${selectedAffiliate.sales.length})`, activeClass: '' },
                  { key: 'pending', label: `Pending (${selectedAffiliate.sales.filter(s => s.status === 'pending').length})`, activeClass: 'bg-yellow-600 hover:bg-yellow-700' },
                  { key: 'paid', label: `Paid (${selectedAffiliate.sales.filter(s => s.status === 'paid').length})`, activeClass: 'bg-green-600 hover:bg-green-700' },
                ].map(({ key, label, activeClass }) => (
                  <Button key={key} onClick={() => setFilterStatus(key)}
                    variant={filterStatus === key ? 'default' : 'outline'} size="sm"
                    className={filterStatus === key && activeClass ? activeClass : ''}>
                    {label}
                  </Button>
                ))}
              </div>

              <h4 className="text-base sm:text-lg font-bold mb-4">Sales History</h4>
              <div className="space-y-3">
                {getFilteredSales(selectedAffiliate.sales).map((sale) => (
                  <div key={sale.id} className="border rounded-xl p-3 sm:p-4 hover:shadow-md transition-shadow">
                    <div className="flex justify-between items-start mb-3 gap-2">
                      <div className="min-w-0">
                        <div className="font-medium text-sm">Order #{sale.orderId?.slice(0, 8) || 'N/A'}</div>
                        <div className="text-xs text-gray-500">{sale.date}</div>
                        <div className="text-xs text-gray-500 truncate">{sale.userEmail}</div>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <div className="font-bold text-base sm:text-lg">R{sale.revenue.toFixed(2)}</div>
                        <div className="text-xs text-blue-600 font-semibold">R{sale.commission.toFixed(2)}</div>
                      </div>
                    </div>

                    {sale.products?.length > 0 && (
                      <div className="mb-3 border-t pt-3">
                        <p className="text-xs font-medium mb-1.5">Products:</p>
                        <div className="space-y-1">
                          {sale.products.map((product, idx) => (
                            <div key={idx} className="text-xs text-gray-600 flex justify-between">
                              <span className="truncate mr-2">{product.ProductName} x{product.Quantity}</span>
                              <span className="flex-shrink-0">R{(product.Price * product.Quantity).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-3 border-t gap-2">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                        sale.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {sale.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                      {sale.status === 'pending' && (
                        <Button onClick={() => handlePayCommission(selectedAffiliate, sale.id, sale.commission)}
                          disabled={processingPayment === sale.id} size="sm"
                          className="bg-green-500 hover:bg-green-600 text-xs h-7">
                          {processingPayment === sale.id
                            ? <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" />Processing...</>
                            : <><DollarSign className="w-3.5 h-3.5 mr-1" />Mark as Paid</>
                          }
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {getFilteredSales(selectedAffiliate.sales).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <ShoppingCart className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No {filterStatus !== 'all' ? filterStatus : ''} sales found</p>
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