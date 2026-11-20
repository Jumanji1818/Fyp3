import React, { useState } from 'react';
import {
  PackageCheck,
  Truck,
  CheckCircle,
  AlertTriangle,
  Clock,
  Check,
  X,
  FileText,
  Calendar,
  XCircle,
  ShieldAlert,
  ShieldCheck,
  Printer,
  Eye,
  RotateCcw,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { StatusChip } from '../common/StatusChip';
import { Modal } from '../common/Modal';
import { PrintViewModal, DocumentData } from '../common/PrintViewModal';
import { PurchaseOrder, DeliveryRecord } from '../../types';

export const StoreReceivingModule: React.FC = () => {
  const { purchaseOrders, deliveries, receiveDelivery, currentUser, currentOrganization } = useApp();

  // Multi-tenant organization scoping for POs
  const orgPOs = purchaseOrders.filter((po) =>
    po.organizationId ? po.organizationId === currentOrganization.id : currentOrganization.id === 'org-emerald'
  );

  // Multi-tenant organization scoping for Deliveries (strictly isolates so Husab Design never sees Emerald Court records)
  const orgDeliveries = deliveries.filter((del) => {
    if (del.organizationId) {
      return del.organizationId === currentOrganization.id;
    }
    return orgPOs.some(
      (po) => po.id === del.purchaseOrderId || po.referenceNumber === del.poReference
    );
  });

  const [activeTab, setActiveTab] = useState<'awaiting' | 'approved' | 'rejected'>('awaiting');
  const [activePO, setActivePO] = useState<PurchaseOrder | null>(null);
  const [inspectionVerdict, setInspectionVerdict] = useState<'Approve' | 'Reject'>('Approve');
  const [rejectionReason, setRejectionReason] = useState('');
  const [printDoc, setPrintDoc] = useState<DocumentData | null>(null);

  const [itemsReceived, setItemsReceived] = useState<
    Array<{
      description: string;
      ordered: number;
      received: number;
      status: 'Accepted' | 'Partially Accepted' | 'Rejected';
      reason?: string;
    }>
  >([]);

  const openInspection = (po: PurchaseOrder) => {
    setActivePO(po);
    setInspectionVerdict('Approve');
    setRejectionReason('');
    setItemsReceived(
      po.items.map((i) => ({
        description: i.description,
        ordered: i.quantity,
        received: i.quantity,
        status: 'Accepted',
      }))
    );
  };

  const handleLineStatusChange = (
    idx: number,
    status: 'Accepted' | 'Partially Accepted' | 'Rejected',
    receivedQty: number,
    reason?: string
  ) => {
    const copy = [...itemsReceived];
    copy[idx] = {
      ...copy[idx],
      status,
      received: status === 'Rejected' ? 0 : receivedQty,
      reason,
    };
    setItemsReceived(copy);
  };

  const handleConfirmInspection = () => {
    if (!activePO) return;

    if (inspectionVerdict === 'Reject') {
      const reason =
        rejectionReason.trim() || 'Physical inspection failed quality standards or non-conforming items.';
      const rejectedItems = itemsReceived.map((line) => ({
        ...line,
        received: 0,
        status: 'Rejected' as const,
        reason: line.reason || reason,
      }));
      receiveDelivery(activePO.id, rejectedItems, 'Rejected', reason);
      setActiveTab('rejected');
    } else {
      receiveDelivery(activePO.id, itemsReceived, 'Approved');
      setActiveTab('approved');
    }
    setActivePO(null);
  };

  // POs needing delivery receiving - strictly excludes Rejected, Delivered, Closed, and Cancelled
  const deliverablePOs = orgPOs.filter(
    (po) =>
      po.status !== 'Closed' &&
      po.status !== 'Cancelled' &&
      po.status !== 'Delivered' &&
      po.status !== 'Rejected'
  );

  // Approved deliveries list
  const approvedDeliveries = orgDeliveries.filter((d) => d.outcome !== 'Rejected');

  // Rejected deliveries list (deliveries with outcome === 'Rejected' OR POs with status === 'Rejected')
  const rejectedDeliveries = orgDeliveries.filter((d) => d.outcome === 'Rejected');
  const rejectedPOs = orgPOs.filter((po) => po.status === 'Rejected');

  // Open official GRN printable modal
  const openGRNModal = (del: DeliveryRecord) => {
    const matchingPO = orgPOs.find((p) => p.id === del.purchaseOrderId || p.referenceNumber === del.poReference);
    setPrintDoc({
      type: 'Purchase Order',
      reference: `GRN-${del.poReference}`,
      title: `Goods Receipt Note (GRN) - ${del.poReference}`,
      date: del.receivedDate,
      recipientName: del.vendorName,
      department: matchingPO?.departmentName || 'Central Stores & Logistics',
      amount: matchingPO?.totalAmount,
      items: del.itemsReceived.map((i) => ({
        description: i.description,
        quantity: i.received,
        unit: 'Unit',
        unitPrice: 0,
        totalPrice: 0,
      })),
      notes: `Inspection Verdict: Consignment Verified & Formally Accepted by ${del.receivedByName}. Goods Receipt Note issued for payment voucher processing.`,
      metaFields: [
        { label: 'Inspection Date', value: del.receivedDate },
        { label: 'Inspector / Officer', value: del.receivedByName },
        { label: 'Delivery Schedule', value: del.onTime ? 'On Schedule' : `Late by ${del.lateDays} days` },
        { label: 'Dispatch Notes', value: del.dispatchNotes || 'Standard consignment' },
      ],
    });
  };

  // Open official Goods Rejection Advice (GRRA) printable modal
  const openRejectionAdviceModal = (item: { poReference: string; vendorName: string; rejectionReason?: string; receivedDate?: string; receivedByName?: string }) => {
    const matchingPO = orgPOs.find((p) => p.referenceNumber === item.poReference);
    setPrintDoc({
      type: 'Purchase Order',
      reference: `RVR-${item.poReference}`,
      title: `Official Goods Rejection & Return Advice (GRRA) - ${item.poReference}`,
      date: item.receivedDate || new Date().toISOString().split('T')[0],
      recipientName: item.vendorName,
      department: matchingPO?.departmentName || 'Stores & Inspection Division',
      amount: matchingPO?.totalAmount,
      notes: `NOTICE OF CONSIGNMENT REJECTION: The delivery under ${item.poReference} was formally rejected upon physical inspection on ${item.receivedDate || 'gate arrival'}.\n\nRejection Ground / Non-Conformance Details: ${item.rejectionReason || 'Consignment failed technical tolerance tests and physical specifications.'}\n\nAction Required: Supplier must retrieve rejected materials within 7 working days and rectify non-conforming items per contractual terms.`,
      metaFields: [
        { label: 'Purchase Order Ref', value: item.poReference },
        { label: 'Vendor Entity', value: item.vendorName },
        { label: 'Inspection Determination', value: 'Disapproved & Returned' },
        { label: 'Inspecting Officer', value: item.receivedByName || currentUser?.fullName || 'Quality Inspector' },
      ],
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-[#0D1F17] border border-[#1F3A2D] flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-serif-heading text-[#F2EFE6]">
            Store Receiving & Delivery Verification
          </h2>
          <p className="text-xs text-[#A8B5AB] mt-0.5">
            Physical gate inspection, schedule compliance verification, electronic GRN generation, and vendor scoring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-[#132A20] px-3.5 py-2 rounded-xl text-xs text-[#3FB67A] font-semibold border border-[#1F3A2D]">
            <PackageCheck className="w-4 h-4 text-[#3FB67A]" />{' '}
            {approvedDeliveries.length} Approved GRNs
          </div>
          <div className="flex items-center gap-2 bg-[#132A20] px-3.5 py-2 rounded-xl text-xs text-[#D9534F] font-semibold border border-[#D9534F]/30">
            <XCircle className="w-4 h-4 text-[#D9534F]" />{' '}
            {rejectedDeliveries.length + rejectedPOs.length} Rejected Consignments
          </div>
        </div>
      </div>

      {/* TABS NAVIGATION */}
      <div className="flex items-center gap-2 border-b border-[#1F3A2D] pb-3 text-xs">
        <button
          onClick={() => setActiveTab('awaiting')}
          className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'awaiting'
              ? 'bg-[#132A20] text-[#D4AF37] border border-[#D4AF37]/40 shadow'
              : 'text-[#A8B5AB] hover:text-[#F2EFE6] hover:bg-[#132A20]/50'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Awaiting Gate Inspection</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#07130E] border border-[#1F3A2D] text-[#D4AF37]">
            {deliverablePOs.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('approved')}
          className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'approved'
              ? 'bg-[#132A20] text-[#3FB67A] border border-[#3FB67A]/40 shadow'
              : 'text-[#A8B5AB] hover:text-[#F2EFE6] hover:bg-[#132A20]/50'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>Approved Deliveries & GRNs</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#07130E] border border-[#1F3A2D] text-[#3FB67A]">
            {approvedDeliveries.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('rejected')}
          className={`px-4 py-2.5 rounded-xl font-semibold flex items-center gap-2 transition-all ${
            activeTab === 'rejected'
              ? 'bg-[#132A20] text-[#D9534F] border border-[#D9534F]/40 shadow'
              : 'text-[#A8B5AB] hover:text-[#F2EFE6] hover:bg-[#132A20]/50'
          }`}
        >
          <XCircle className="w-4 h-4" />
          <span>Rejected Consignments & Return Slips</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#07130E] border border-[#1F3A2D] text-[#D9534F]">
            {rejectedDeliveries.length + rejectedPOs.length}
          </span>
        </button>
      </div>

      {/* TAB 1: POs Awaiting Receiving */}
      {activeTab === 'awaiting' && (
        <div className="bg-[#0D1F17] rounded-2xl border border-[#1F3A2D] p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold font-serif-heading text-[#F2EFE6]">
              Purchase Orders Awaiting Consignment Verification ({deliverablePOs.length})
            </h3>
            <span className="text-[11px] text-[#A8B5AB]">
              Active orders ready for physical gate inspection
            </span>
          </div>

          {deliverablePOs.length === 0 ? (
            <div className="p-8 text-center bg-[#132A20]/50 rounded-xl border border-[#1F3A2D] text-[#A8B5AB]">
              <CheckCircle className="w-8 h-8 text-[#3FB67A] mx-auto mb-2 opacity-80" />
              <p className="font-semibold text-sm text-[#F2EFE6]">No Consignments Currently Pending Inspection</p>
              <p className="text-xs mt-1">All dispatched purchase orders have been inspected or settled.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {deliverablePOs.map((po) => {
                const isOverdue = new Date(po.expectedDeliveryDate).getTime() < new Date().getTime();

                return (
                  <div
                    key={po.id}
                    className={`p-4 rounded-xl border flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors ${
                      isOverdue ? 'bg-[#D9534F]/10 border-[#D9534F]/40' : 'bg-[#132A20] border-[#1F3A2D]'
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#E8CF7A]">{po.referenceNumber}</span>
                        <span className="font-semibold text-[#F2EFE6]">{po.vendorName}</span>
                        <StatusChip status={po.status} size="sm" />
                        {isOverdue && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#D9534F] text-white">
                            OVERDUE COMMITMENT
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#A8B5AB] mt-1">
                        Committed Delivery Date: <strong className="text-[#F2EFE6]">{po.expectedDeliveryDate}</strong> · Value: ₦{po.totalAmount.toLocaleString()}
                      </div>
                      {po.dispatchNotes && (
                        <div className="text-[11px] text-[#3FB67A] mt-1">
                          Vendor Dispatch Note: &quot;{po.dispatchNotes}&quot;
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openInspection(po)}
                        className="px-4 py-2 rounded-[10px] bg-gradient-to-r from-[#1F6F4A] to-[#0F3D2A] border border-[#D4AF37]/50 text-[#F2EFE6] font-semibold flex items-center gap-1.5 hover:brightness-110 shadow"
                      >
                        <PackageCheck className="w-3.5 h-3.5 text-[#D4AF37]" /> Inspect & Verify Consignment
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Approved Deliveries Log */}
      {activeTab === 'approved' && (
        <div className="bg-[#0D1F17] rounded-2xl border border-[#1F3A2D] p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold font-serif-heading text-[#F2EFE6]">
              Verified & Approved Consignments ({approvedDeliveries.length})
            </h3>
            <span className="text-[11px] text-[#3FB67A]">
              Electronic GRNs Issued & Ready for Invoice Settlement
            </span>
          </div>

          {approvedDeliveries.length === 0 ? (
            <div className="p-8 text-center text-[#A8B5AB] bg-[#132A20]/40 rounded-xl">
              No approved delivery records found for {currentOrganization.name}.
            </div>
          ) : (
            <div className="overflow-x-auto text-xs">
              <table className="w-full text-left">
                <thead className="bg-[#132A20] text-[#A8B5AB] border-b border-[#1F3A2D]">
                  <tr>
                    <th className="py-2.5 px-3">PO Reference</th>
                    <th className="py-2.5 px-3">Vendor</th>
                    <th className="py-2.5 px-3">Received By</th>
                    <th className="py-2.5 px-3">Inspection Date</th>
                    <th className="py-2.5 px-3 text-center">Schedule</th>
                    <th className="py-2.5 px-3 text-center">Outcome</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1F3A2D]">
                  {approvedDeliveries.map((del) => (
                    <tr key={del.id} className="hover:bg-[#132A20]/40">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#E8CF7A]">{del.poReference}</td>
                      <td className="py-2.5 px-3 font-semibold text-[#F2EFE6]">{del.vendorName}</td>
                      <td className="py-2.5 px-3 text-[#A8B5AB]">{del.receivedByName}</td>
                      <td className="py-2.5 px-3 text-[#A8B5AB]">{del.receivedDate}</td>
                      <td className="py-2.5 px-3 text-center">
                        {del.onTime ? (
                          <span className="px-2 py-0.5 rounded-full bg-[#3FB67A]/20 text-[#3FB67A] text-[10px] font-semibold border border-[#3FB67A]/30">
                            On Time
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-[#D9534F]/20 text-[#D9534F] text-[10px] font-semibold border border-[#D9534F]/30">
                            Late by {del.lateDays} days
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <span className="px-2.5 py-0.5 rounded-full bg-[#3FB67A]/20 text-[#3FB67A] text-[10px] font-semibold border border-[#3FB67A]/30 flex items-center gap-1 mx-auto w-fit">
                          <CheckCircle className="w-3 h-3" /> GRN Issued
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={() => openGRNModal(del)}
                          className="px-2.5 py-1 rounded-lg bg-[#132A20] hover:bg-[#1F3A2D] text-[#D4AF37] border border-[#D4AF37]/40 text-xs font-semibold inline-flex items-center gap-1"
                        >
                          <FileText className="w-3 h-3" /> View GRN
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Rejected Consignments & Return Slips */}
      {activeTab === 'rejected' && (
        <div className="bg-[#0D1F17] rounded-2xl border border-[#1F3A2D] p-5 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold font-serif-heading text-[#F2EFE6]">
                Rejected Consignments & Goods Return Advices ({rejectedDeliveries.length + rejectedPOs.length})
              </h3>
              <p className="text-xs text-[#A8B5AB]">
                Consignments that failed quality, specification, or damage checks. Removed from pending queue.
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-[#D9534F]/20 text-[#D9534F] border border-[#D9534F]/40 flex items-center gap-1">
              <ShieldAlert className="w-3.5 h-3.5" /> Disapproved Materials
            </span>
          </div>

          {rejectedDeliveries.length === 0 && rejectedPOs.length === 0 ? (
            <div className="p-8 text-center text-[#A8B5AB] bg-[#132A20]/40 rounded-xl">
              No rejected deliveries recorded for {currentOrganization.name}.
            </div>
          ) : (
            <div className="space-y-3">
              {/* Combine rejected deliveries and any POs marked Rejected */}
              {rejectedDeliveries.map((del) => (
                <div
                  key={del.id}
                  className="p-4 rounded-xl bg-[#D9534F]/10 border border-[#D9534F]/40 flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-[#E8CF7A]">{del.poReference}</span>
                      <span className="font-semibold text-[#F2EFE6]">{del.vendorName}</span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#D9534F] text-white flex items-center gap-1">
                        <XCircle className="w-3 h-3" /> CONSIGNMENT REJECTED
                      </span>
                    </div>
                    <div className="text-[11px] text-[#A8B5AB]">
                      Inspected by: <strong className="text-[#F2EFE6]">{del.receivedByName}</strong> on {del.receivedDate}
                    </div>
                    <div className="text-xs text-[#F2EFE6] bg-[#07130E] p-2.5 rounded-lg border border-[#D9534F]/30 mt-1.5">
                      <strong className="text-[#D9534F] block text-[10px] uppercase font-bold tracking-wider">
                        Rejection Ground / Non-Conformance Details:
                      </strong>
                      {del.rejectionReason || 'Consignment failed technical tolerance tests and physical specifications.'}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => openRejectionAdviceModal(del)}
                      className="px-4 py-2 rounded-[10px] bg-[#132A20] hover:bg-[#D9534F]/20 text-[#D9534F] border border-[#D9534F]/50 font-semibold text-xs flex items-center gap-1.5 transition-all shadow"
                    >
                      <Printer className="w-3.5 h-3.5 text-[#D9534F]" /> Print Rejection Advice (GRRA)
                    </button>
                  </div>
                </div>
              ))}

              {/* Extra check for POs marked Rejected that may not have a Delivery record yet */}
              {rejectedPOs
                .filter((po) => !rejectedDeliveries.some((d) => d.poReference === po.referenceNumber || d.purchaseOrderId === po.id))
                .map((po) => (
                  <div
                    key={po.id}
                    className="p-4 rounded-xl bg-[#D9534F]/10 border border-[#D9534F]/40 flex flex-col md:flex-row md:items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-[#E8CF7A]">{po.referenceNumber}</span>
                        <span className="font-semibold text-[#F2EFE6]">{po.vendorName}</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#D9534F] text-white flex items-center gap-1">
                          <XCircle className="w-3 h-3" /> REJECTED
                        </span>
                      </div>
                      <div className="text-[11px] text-[#A8B5AB]">
                        Department: {po.departmentName} · Order Total: ₦{po.totalAmount.toLocaleString()}
                      </div>
                      <div className="text-xs text-[#F2EFE6] bg-[#07130E] p-2 rounded-lg border border-[#D9534F]/30">
                        Consignment failed verification standards and has been marked Disapproved.
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => openRejectionAdviceModal({ poReference: po.referenceNumber, vendorName: po.vendorName, rejectionReason: 'Inspection failed quality criteria.' })}
                        className="px-4 py-2 rounded-[10px] bg-[#132A20] hover:bg-[#D9534F]/20 text-[#D9534F] border border-[#D9534F]/50 font-semibold text-xs flex items-center gap-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" /> Rejection Notice
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      )}

      {/* INSPECTION MODAL */}
      {activePO && (
        <Modal
          isOpen={!!activePO}
          onClose={() => setActivePO(null)}
          title={`Store Inspection: ${activePO.referenceNumber}`}
          subtitle={`Supplier: ${activePO.vendorName} · Committed Date: ${activePO.expectedDeliveryDate}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-5 text-xs">
            <div className="p-3.5 rounded-xl bg-[#07130E] border border-[#1F3A2D] flex items-center justify-between">
              <div>
                <span className="font-semibold text-[#F2EFE6]">Delivery Schedule Verification:</span>
                <p className="text-[11px] text-[#A8B5AB] mt-0.5">
                  Today is {new Date().toLocaleDateString('en-GB')}. System calculates compliance against committed deadline ({activePO.expectedDeliveryDate}).
                </p>
              </div>
              <Clock className="w-5 h-5 text-[#D4AF37]" />
            </div>

            {/* OVERALL INSPECTION VERDICT SELECTOR */}
            <div className="p-4 rounded-xl bg-[#132A20] border border-[#1F3A2D] space-y-3">
              <label className="font-bold text-[#F2EFE6] block">
                Official Consignment Inspection Determination:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setInspectionVerdict('Approve')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    inspectionVerdict === 'Approve'
                      ? 'bg-[#1F6F4A]/30 border-[#3FB67A] ring-1 ring-[#3FB67A]'
                      : 'bg-[#07130E] border-[#1F3A2D] hover:border-[#3FB67A]/50'
                  }`}
                >
                  <ShieldCheck
                    className={`w-5 h-5 mt-0.5 shrink-0 ${
                      inspectionVerdict === 'Approve' ? 'text-[#3FB67A]' : 'text-[#A8B5AB]'
                    }`}
                  />
                  <div>
                    <div className="font-bold text-[#F2EFE6]">Approve & Accept Consignment</div>
                    <p className="text-[10px] text-[#A8B5AB] mt-0.5">
                      Items conform to specifications. Issues official Goods Receipt Note (GRN) and authorizes invoice processing.
                    </p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setInspectionVerdict('Reject')}
                  className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all ${
                    inspectionVerdict === 'Reject'
                      ? 'bg-[#D9534F]/25 border-[#D9534F] ring-1 ring-[#D9534F]'
                      : 'bg-[#07130E] border-[#1F3A2D] hover:border-[#D9534F]/50'
                  }`}
                >
                  <ShieldAlert
                    className={`w-5 h-5 mt-0.5 shrink-0 ${
                      inspectionVerdict === 'Reject' ? 'text-[#D9534F]' : 'text-[#A8B5AB]'
                    }`}
                  />
                  <div>
                    <div className="font-bold text-[#F2EFE6]">Reject Consignment</div>
                    <p className="text-[10px] text-[#A8B5AB] mt-0.5">
                      Materials are defective, damaged, or non-conforming. Halts processing and records official disapproval.
                    </p>
                  </div>
                </button>
              </div>

              {inspectionVerdict === 'Reject' && (
                <div className="pt-2 animate-fade-in space-y-1.5">
                  <label className="text-[11px] font-semibold text-[#D9534F] flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> Rejection Ground & Inspection Remarks (Required):
                  </label>
                  <textarea
                    rows={2}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="Specify defect details, discrepancy against BOQ, physical damage, or failed tolerance tests..."
                    className="w-full px-3 py-2 rounded-lg bg-[#07130E] border border-[#D9534F]/50 text-[#F2EFE6] placeholder-[#5B6B61] focus:outline-none focus:border-[#D9534F]"
                  />
                </div>
              )}
            </div>

            {/* LINE BY LINE BREAKDOWN */}
            <div className="space-y-3">
              <span className="font-bold text-[#F2EFE6] block">
                Line Items Physical Verification & Counts:
              </span>
              {itemsReceived.map((line, idx) => (
                <div
                  key={idx}
                  className={`p-3 rounded-xl border space-y-2 transition-colors ${
                    line.status === 'Rejected' || inspectionVerdict === 'Reject'
                      ? 'bg-[#D9534F]/10 border-[#D9534F]/30'
                      : 'bg-[#132A20] border-[#1F3A2D]'
                  }`}
                >
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[#F2EFE6]">{line.description}</span>
                    <span className="text-[#A8B5AB]">Ordered: {line.ordered}</span>
                  </div>

                  <div className="grid grid-cols-12 gap-3 items-center">
                    <div className="col-span-4">
                      <label className="text-[10px] text-[#A8B5AB] block mb-0.5">Quantity Accepted</label>
                      <input
                        type="number"
                        min={0}
                        max={line.ordered}
                        disabled={inspectionVerdict === 'Reject'}
                        value={inspectionVerdict === 'Reject' ? 0 : line.received}
                        onChange={(e) =>
                          handleLineStatusChange(
                            idx,
                            line.status,
                            Math.min(line.ordered, Math.max(0, parseInt(e.target.value) || 0)),
                            line.reason
                          )
                        }
                        className="w-full px-2 py-1.5 rounded-lg bg-[#07130E] border border-[#1F3A2D] text-[#F2EFE6] disabled:opacity-50"
                      />
                    </div>

                    <div className="col-span-4">
                      <label className="text-[10px] text-[#A8B5AB] block mb-0.5">Item Status</label>
                      <select
                        disabled={inspectionVerdict === 'Reject'}
                        value={inspectionVerdict === 'Reject' ? 'Rejected' : line.status}
                        onChange={(e) =>
                          handleLineStatusChange(
                            idx,
                            e.target.value as any,
                            e.target.value === 'Rejected' ? 0 : line.received,
                            line.reason
                          )
                        }
                        className="w-full px-2 py-1.5 rounded-lg bg-[#07130E] border border-[#1F3A2D] text-[#F2EFE6] disabled:opacity-50"
                      >
                        <option value="Accepted">Accepted & Conforming</option>
                        <option value="Partially Accepted">Partially Accepted</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>

                    <div className="col-span-4">
                      <label className="text-[10px] text-[#A8B5AB] block mb-0.5">Specific Remarks</label>
                      <input
                        type="text"
                        placeholder="Condition / comments"
                        value={line.reason || ''}
                        onChange={(e) =>
                          handleLineStatusChange(idx, line.status, line.received, e.target.value)
                        }
                        className="w-full px-2 py-1.5 rounded-lg bg-[#07130E] border border-[#1F3A2D] text-[#F2EFE6]"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#1F3A2D]">
              <button
                type="button"
                onClick={() => setActivePO(null)}
                className="px-4 py-2 text-[#A8B5AB] hover:text-[#F2EFE6]"
              >
                Cancel
              </button>

              {inspectionVerdict === 'Reject' ? (
                <button
                  type="button"
                  onClick={handleConfirmInspection}
                  className="px-6 py-2.5 rounded-[10px] bg-[#D9534F] hover:bg-[#c9302c] border border-red-400 text-white font-semibold text-xs flex items-center gap-1.5 shadow-lg active:scale-95 transition-all"
                >
                  <XCircle className="w-4 h-4 text-white" /> Confirm Rejection & Issue Return Advice
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleConfirmInspection}
                  className="px-6 py-2.5 rounded-[10px] bg-gradient-to-r from-[#1F6F4A] to-[#0F3D2A] border border-[#D4AF37]/50 text-[#F2EFE6] font-semibold text-xs flex items-center gap-1.5 hover:brightness-110 shadow-lg active:scale-95 transition-all"
                >
                  <CheckCircle className="w-4 h-4 text-[#D4AF37]" /> Confirm Inspection & Approve (Issue GRN)
                </button>
              )}
            </div>
          </div>
        </Modal>
      )}

      {/* PRINT VIEW MODAL FOR GRN & GOODS REJECTION ADVICE */}
      <PrintViewModal
        isOpen={!!printDoc}
        onClose={() => setPrintDoc(null)}
        doc={printDoc}
      />
    </div>
  );
};
