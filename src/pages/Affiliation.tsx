import React, { useState, useEffect, useContext } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, ShoppingCart, DollarSign, Clock, CheckCircle, Edit2, Save, X, Eye } from "lucide-react";
import {
  collection, getDocs, query, where,
  updateDoc, doc, getDoc, setDoc, addDoc, serverTimestamp
} from "firebase/firestore";
import emailjs from '@emailjs/browser';
import AppContext from "../context/AppContext";
import { useToast } from "@/hooks/use-toast";

// ─── EmailJS Config ───────────────────────────────────────────────────────────
// Replace these with your actual values from https://emailjs.com/account
const EMAILJS_SERVICE_ID  = 'YOUR_SERVICE_ID';   // e.g. 'service_abc123'
const EMAILJS_TEMPLATE_ID = 'YOUR_TEMPLATE_ID';  // e.g. 'template_xyz789'
const EMAILJS_PUBLIC_KEY  = 'YOUR_PUBLIC_KEY';   // e.g. 'user_XXXXXXXXXXXXXXX'

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

  // ─── Commission Rate ──────────────────────────────────────────────────────────
  // Stored in StoreConfigs/StoreConfig001 → AffiliationCustomization.commissionRate
  const fetchCommissionRate = async () => {
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
  };

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
      console.error('Error updating commission rate:', error);
      toast({ title: "Error", description: "Failed to update commission rate", variant: "destructive" });
    }
  };

  // ─── Data Fetching ────────────────────────────────────────────────────────────
  const fetchAffiliationData = async () => {
    try {
      const usersSnapshot = await getDocs(
        query(collection(db, 'Users'), where('IsAffiliate', '==', true))
      );
      const historySnapshot = await getDocs(collection(db, 'AffiliateHistory'));

      const affiliateData = new Map();
      let globalStats = {
        totalAffiliates: usersSnapshot.size,
        totalSales: 0, totalRevenue: 0,
        totalCommissionPaid: 0, totalCommissionPending: 0,
      };

      usersSnapshot.forEach((userDoc) => {
        const userData = userDoc.data();
        if (userData.AffiliateId) {
          affiliateData.set(userData.AffiliateId, {
            id: userData.AffiliateId,
            userId: userDoc.id,          // used for Notifications lookup
            name: userData.Name || 'Unknown',
            email: userData.UserID || userData.Email || '',
            address: userData.Address || '',
            city: userData.City || '',
            country: userData.Country || '',
            phone: userData.Phone || '',
            sales: [],
            totalSales: 0, totalRevenue: 0,
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
        const revenue = typeof data.Total === 'string' ? parseFloat(data.Total) : (data.Total || 0);
        const commission = data.Commission || 0;
        const isPaid = data.Status === 'paid';

        affiliate.sales.push({
          id: historyDoc.id, orderId: data.OrderID, date: data.PurchaseDate,
          revenue, commission, status: data.Status || 'pending',
          products: data.Products || [], userEmail: data.UserID || '',
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
      toast({ title: "Error", description: "Failed to load affiliation data", variant: "destructive" });
    }
  };

  // ─── Notifications + Email ────────────────────────────────────────────────────
  /**
   * 1. Writes to `Notifications` collection — affiliate's frontend listens to this
   *    in real-time via NotificationBell.jsx / useNotifications.js.
   * 2. Sends an email via EmailJS directly from the browser — no backend needed,
   *    no Firebase Blaze plan required.
   */
  const sendPaymentNotification = async (affiliate, amount, saleIds) => {
    try {
      // 1. In-app notification
      if (affiliate.userId) {
        await addDoc(collection(db, 'Notifications'), {
          userId: affiliate.userId,
          affiliateId: affiliate.id,
          type: 'commission_paid',
          title: 'Commission Payment Received! 🎉',
          message: `Your commission of R${amount.toFixed(2)} has been marked as paid. Thank you for your referrals!`,
          amount,
          saleIds,
          read: false,
          createdAt: serverTimestamp(),
        });
      }

      // 2. Email via EmailJS (free, no backend, no credit card required)
      if (affiliate.email) {
        await emailjs.send(
          EMAILJS_SERVICE_ID,
          EMAILJS_TEMPLATE_ID,
          {
            to_email: affiliate.email,   // maps to {{to_email}} in your template
            to_name:  affiliate.name,    // maps to {{to_name}}
            amount:   `R${amount.toFixed(2)}`, // maps to {{amount}}
          },
          EMAILJS_PUBLIC_KEY
        );
      }
    } catch (error) {
      // Non-critical – log but don't block the pay action
      console.error('Notification/email error:', error);
    }
  };

  // ─── Pay Handlers ─────────────────────────────────────────────────────────────
  const handlePayCommission = async (affiliate, saleId, saleCommission) => {
    setProcessingPayment(saleId);
    try {
      await updateDoc(doc(db, 'AffiliateHistory', saleId), {
        Status: 'paid',
        PaidAt: new Date().toISOString(),
      });
      await sendPaymentNotification(affiliate, saleCommission, [saleId]);
      await fetchAffiliationData();

      // Keep modal in sync without re-fetching
      setSelectedAffiliate(prev => prev ? {
        ...prev,
        sales: prev.sales.map(s => s.id === saleId ? { ...s, status: 'paid' } : s),
        commissionPaid: prev.commissionPaid + saleCommission,
        commissionPending: prev.commissionPending - saleCommission,
      } : prev);

      toast({ title: "Payment Processed", description: "Commission marked as paid." });
    } catch (error) {
      console.error('Error updating payment status:', error);
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
      toast({ title: "No Pending Payments", description: "This affiliate has no pending commissions." });
      return;
    }

    try {
      await Promise.all(pendingSales.map(sale =>
        updateDoc(doc(db, 'AffiliateHistory', sale.id), { Status: 'paid', PaidAt: new Date().toISOString() })
      ));
      const totalPaid = pendingSales.reduce((sum, s) => sum + s.commission, 0);
      await sendPaymentNotification(affiliate, totalPaid, pendingSales.map(s => s.id));
      await fetchAffiliationData();
      toast({ title: "All Payments Processed", description: `Paid R${totalPaid.toFixed(2)} to ${affiliate.name}` });
    } catch (error) {
      console.error('Error paying all commissions:', error);
      toast({ title: "Error", description: "Failed to process all payments", variant: "destructive" });
    }
  };

  const viewAffiliateDetails = (affiliate) => {
    setSelectedAffiliate(affiliate);
    setFilterStatus('all');
    setShowDetailsModal(true);
  };

  const getFilteredSales = (sales) =>
    filterStatus === 'all' ? sales : sales.filter(s => s.status === filterStatus);

  // ─── Render ───────────────────────────────────────────────────────────────────
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
        <h1 className="text-3xl font-bold">Affiliate Management</h1>
        <div className="flex items-center gap-3 bg-white p-4 rounded-lg shadow-sm border w-full md:w-auto">
          <span className="text-sm font-medium text-gray-600">Global Commission:</span>
          {isEditingRate ? (
            <div className="flex items-center gap-2">
              <Input type="number" value={tempRate} onChange={e => setTempRate(Number(e.target.value))}
                className="w-20 px-2 py-1" min="0" max="100" />
              <span className="text-lg font-bold">%</span>
              <Button onClick={updateCommissionRate} size="sm" className="bg-green-500 hover:bg-green-600"><Save className="w-4 h-4" /></Button>
              <Button onClick={() => { setTempRate(globalCommissionRate); setIsEditingRate(false); }} size="sm" variant="secondary"><X className="w-4 h-4" /></Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-blue-600">{globalCommissionRate}%</span>
              <Button onClick={() => setIsEditingRate(true)} size="sm" className="bg-blue-500 hover:bg-blue-600"><Edit2 className="w-4 h-4" /></Button>
            </div>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5 mb-8">
        {[
          { label: 'Total Affiliates', value: stats.totalAffiliates, icon: <Users className="h-4 w-4 text-blue-600" />, color: '' },
          { label: 'Total Sales', value: stats.totalSales, icon: <ShoppingCart className="h-4 w-4 text-purple-600" />, color: '' },
          { label: 'Revenue Generated', value: `R${stats.totalRevenue.toFixed(2)}`, icon: <DollarSign className="h-4 w-4 text-green-600" />, color: '' },
          { label: 'Commission Paid', value: `R${stats.totalCommissionPaid.toFixed(2)}`, icon: <CheckCircle className="h-4 w-4 text-green-600" />, color: 'text-green-600' },
          { label: 'Commission Pending', value: `R${stats.totalCommissionPending.toFixed(2)}`, icon: <Clock className="h-4 w-4 text-yellow-600" />, color: 'text-yellow-600' },
        ].map(({ label, value, icon, color }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{label}</CardTitle>{icon}
            </CardHeader>
            <CardContent><div className={`text-2xl font-bold ${color}`}>{value}</div></CardContent>
          </Card>
        ))}
      </div>

      {/* Table */}
      <Card>
        <CardHeader><CardTitle className="text-xl">Affiliate Performance</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  {['Affiliate', 'Sales', 'Revenue', 'Total Commission', 'Paid', 'Pending', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {affiliates.map((affiliate) => (
                  <tr key={affiliate.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900">{affiliate.name}</div>
                      <div className="text-sm text-gray-500">{affiliate.email}</div>
                      <div className="text-xs text-gray-400">ID: {affiliate.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2"><ShoppingCart className="w-4 h-4 text-purple-600" /><span className="font-semibold">{affiliate.totalSales}</span></div>
                    </td>
                    <td className="px-4 py-3"><span className="font-semibold text-green-600">R{affiliate.totalRevenue.toFixed(2)}</span></td>
                    <td className="px-4 py-3"><span className="font-bold text-blue-600">R{affiliate.totalCommission.toFixed(2)}</span></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2"><CheckCircle className="w-4 h-4 text-green-600" /><span className="text-green-600 font-semibold">R{affiliate.commissionPaid.toFixed(2)}</span></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-yellow-600" /><span className="text-yellow-600 font-semibold">R{affiliate.commissionPending.toFixed(2)}</span></div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button onClick={() => viewAffiliateDetails(affiliate)} size="sm" className="bg-blue-500 hover:bg-blue-600">
                          <Eye className="w-4 h-4 mr-1" />View
                        </Button>
                        {affiliate.commissionPending > 0 && (
                          <Button onClick={() => handlePayAllPending(affiliate.id)} size="sm" className="bg-green-500 hover:bg-green-600">
                            <DollarSign className="w-4 h-4 mr-1" />Pay All
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
                <Users className="w-12 h-12 mx-auto mb-3 opacity-30" /><p>No affiliates found</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {showDetailsModal && selectedAffiliate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-white border-b px-6 py-4 flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold">{selectedAffiliate.name}</h3>
                <p className="text-sm text-gray-500">{selectedAffiliate.email}</p>
                {selectedAffiliate.phone && <p className="text-sm text-gray-500">{selectedAffiliate.phone}</p>}
                {selectedAffiliate.address && (
                  <p className="text-sm text-gray-500">{selectedAffiliate.address}, {selectedAffiliate.city}, {selectedAffiliate.country}</p>
                )}
              </div>
              <Button onClick={() => setShowDetailsModal(false)} variant="ghost" size="sm"><X className="w-6 h-6" /></Button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Total Sales', value: selectedAffiliate.totalSales, bg: 'bg-purple-50', color: 'text-purple-600' },
                  { label: 'Revenue', value: `R${selectedAffiliate.totalRevenue.toFixed(2)}`, bg: 'bg-green-50', color: 'text-green-600' },
                  { label: 'Total Commission', value: `R${selectedAffiliate.totalCommission.toFixed(2)}`, bg: 'bg-blue-50', color: 'text-blue-600' },
                  { label: 'Pending', value: `R${selectedAffiliate.commissionPending.toFixed(2)}`, bg: 'bg-yellow-50', color: 'text-yellow-600' },
                ].map(({ label, value, bg, color }) => (
                  <div key={label} className={`${bg} p-4 rounded-lg`}>
                    <div className={`text-sm ${color} mb-1`}>{label}</div>
                    <div className="text-2xl font-bold">{value}</div>
                  </div>
                ))}
              </div>

              {selectedAffiliate.commissionPending > 0 && (
                <div className="mb-4 flex justify-end">
                  <Button onClick={() => handlePayAllPending(selectedAffiliate.id)} className="bg-green-500 hover:bg-green-600">
                    <DollarSign className="w-4 h-4 mr-2" />Pay All Pending (R{selectedAffiliate.commissionPending.toFixed(2)})
                  </Button>
                </div>
              )}

              <div className="flex gap-2 mb-4">
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
                    {sale.products?.length > 0 && (
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
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${sale.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                        {sale.status === 'paid' ? 'Paid' : 'Pending'}
                      </span>
                      {sale.status === 'pending' && (
                        <Button onClick={() => handlePayCommission(selectedAffiliate, sale.id, sale.commission)}
                          disabled={processingPayment === sale.id} size="sm" className="bg-green-500 hover:bg-green-600">
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