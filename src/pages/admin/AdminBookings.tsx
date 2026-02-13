import { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-toastify';
import { supabase } from '../../lib/supabase';
import {
  Booking,
  BookingStatus,
  BookingStatusHistory,
} from '../../types/database';
import {
  Search,
  X,
  Eye,
  CheckCircle,
  Phone,
  MapPin,
  Package as PackageIcon,
  History,
  Send,
  User,
} from 'lucide-react';


const AdminBookings = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [filteredBookings, setFilteredBookings] = useState<Booking[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<BookingStatus | 'all'>(
    'all'
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [bookingHistory, setBookingHistory] = useState<BookingStatusHistory[]>([]);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [newStatus, setNewStatus] = useState<BookingStatus | ''>('');
  const [statusNote, setStatusNote] = useState('');
  const [riderName, setRiderName] = useState('');
  const [riderPhone, setRiderPhone] = useState('');

  const statuses: BookingStatus[] = [
    'pending',
    'confirmed',
    'in_progress',
    'delivered',
    'not_accepted',
    'cancelled',
  ];

  useEffect(() => {
    fetchBookings();
  }, []);

  const filterBookings = useCallback(() => {
    let filtered = bookings;

    // Filter by status
    if (selectedStatus !== 'all') {
      filtered = filtered.filter((b) => b.status === selectedStatus);
    }

    // Filter by search term (tracking ID or sender name)
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (b) =>
          b.tracking_id.toLowerCase().includes(term) ||
          b.sender_name.toLowerCase().includes(term) ||
          b.sender_phone.includes(term)
      );
    }

    setFilteredBookings(filtered);
  }, [bookings, selectedStatus, searchTerm]);

  useEffect(() => {
    filterBookings();
  }, [filterBookings]);

  const fetchBookings = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBookings(data || []);
    } catch (err) {
      console.error('Error fetching bookings:', err);
      toast.error('Failed to load bookings');
    } finally {
      setIsLoading(false);
    }
  };



  const fetchBookingHistory = async (bookingId: string) => {
    try {
      const { data, error } = await supabase
        .from('booking_status_history')
        .select('*')
        .eq('booking_id', bookingId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setBookingHistory(data || []);
    } catch (err) {
      console.error('Error fetching history:', err);
      toast.error('Failed to load booking history');
    }
  };

  const handleViewDetails = async (booking: Booking) => {
    setSelectedBooking(booking);
    setNewStatus(booking.status);
    setRiderName(booking.rider_name || '');
    setRiderPhone(booking.rider_phone || '');
    setStatusNote('');
    await fetchBookingHistory(booking.id);
    setShowDetailsModal(true);
  };

  const handleUpdateStatus = async () => {
    if (!selectedBooking || !newStatus) {
      toast.error('Please select a new status');
      return;
    }

    try {
      setIsUpdatingStatus(true);

      // Update booking status
      const { error: updateError } = await supabase
        .from('bookings')
        .update({
          status: newStatus,
          rider_name: riderName || null,
          rider_phone: riderPhone || null,
        })
        .eq('id', selectedBooking.id);

      if (updateError) throw updateError;

      // Create history entry
      const { error: historyError } = await supabase
        .from('booking_status_history')
        .insert([
          {
            booking_id: selectedBooking.id,
            status: newStatus,
            note:
              statusNote ||
              `Status changed to ${getStatusLabel(newStatus)}${
                riderName ? ` and assigned to ${riderName}` : ''
              }`,
            created_by: 'admin',
          },
        ]);

      if (historyError) throw historyError;

      toast.success('Booking status updated successfully');
      await fetchBookings();
      setShowDetailsModal(false);
    } catch (err) {
      console.error('Error updating status:', err);
      toast.error('Failed to update status');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSendSMS = async () => {
    if (!selectedBooking) return;

    try {
      // TODO: Implement SMS sending via Supabase Edge Function
      // For now, just log the action
      console.log('Send SMS for booking:', selectedBooking.tracking_id);

      // Create a message log entry
      const { error } = await supabase.from('message_logs').insert([
        {
          message_type: 'sms',
          recipient: selectedBooking.sender_phone,
          booking_id: selectedBooking.id,
          template_code: 'tracking_notification',
          subject: null,
          body: `Your parcel tracking ID: ${selectedBooking.tracking_id}. Track it on our website.`,
          status: 'pending',
          triggered_by: 'admin',
          cost: 0,
        },
      ]);

      if (error) throw error;

      toast.success('SMS queued for sending');
    } catch (err) {
      console.error('Error sending SMS:', err);
      toast.error('Failed to send SMS');
    }
  };

  const getStatusLabel = (status: BookingStatus): string => {
    const labels = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      in_progress: 'In Progress',
      delivered: 'Delivered',
      not_accepted: 'Not Accepted',
      cancelled: 'Cancelled',
    };
    return labels[status];
  };

  const getStatusColor = (status: BookingStatus): string => {
    const colors = {
      pending: 'bg-amber-100 text-amber-800',
      confirmed: 'bg-blue-100 text-blue-800',
      in_progress: 'bg-cyan-100 text-cyan-800',
      delivered: 'bg-green-100 text-green-800',
      not_accepted: 'bg-orange-100 text-orange-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status];
  };

  const nextStatuses: Record<BookingStatus, BookingStatus[]> = {
    pending: ['confirmed', 'not_accepted', 'cancelled'],
    confirmed: ['in_progress', 'not_accepted', 'cancelled'],
    in_progress: ['delivered', 'cancelled'],
    delivered: [],
    not_accepted: ['cancelled', 'pending'],
    cancelled: ['pending'],
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="h-12 w-12 mx-auto mb-4 border-4 border-blue-100 border-t-blue-500 rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading bookings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Dispatch Desk
        </h1>
        <p className="text-gray-600 text-sm mt-1">
          Manage bookings and assign riders
        </p>
      </div>

      {/* Search and Filter */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-5 w-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search by tracking ID, sender name or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Status Tabs */}
        <div className="flex flex-wrap gap-2 mt-4">
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              selectedStatus === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All ({bookings.length})
          </button>
          {statuses.map((status) => {
            const count = bookings.filter((b) => b.status === status).length;
            return (
              <button
                key={status}
                onClick={() => setSelectedStatus(status)}
                className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                  selectedStatus === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {getStatusLabel(status)} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* Bookings List */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
        {filteredBookings.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <PackageIcon className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p>No bookings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {/* Desktop View */}
            <table className="w-full hidden md:table">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Tracking ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Sender
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Rider
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase">
                    Price
                  </th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                        {booking.tracking_id}
                      </code>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <div className="font-medium">{booking.sender_name}</div>
                      <div className="text-xs text-gray-500">
                        {booking.sender_phone}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(
                          booking.status
                        )}`}
                      >
                        {getStatusLabel(booking.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      {booking.rider_name ? (
                        <div>
                          <div className="font-medium">{booking.rider_name}</div>
                          <div className="text-xs text-gray-500">
                            {booking.rider_phone}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                      ₦{booking.price_total.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewDetails(booking)}
                        className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                      >
                        <Eye className="h-4 w-4" />
                        Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Mobile Cards */}
            <div className="md:hidden space-y-3 p-4">
              {filteredBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex items-start justify-between mb-3">
                    <code className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                      {booking.tracking_id}
                    </code>
                    <span
                      className={`text-xs font-semibold px-3 py-1 rounded-full ${getStatusColor(
                        booking.status
                      )}`}
                    >
                      {getStatusLabel(booking.status)}
                    </span>
                  </div>
                  <div className="space-y-2 mb-3">
                    <p className="text-sm font-medium text-gray-900">
                      {booking.sender_name}
                    </p>
                    <p className="text-xs text-gray-600">
                      {booking.sender_phone}
                    </p>
                    {booking.rider_name && (
                      <p className="text-xs text-blue-600 font-medium">
                        Rider: {booking.rider_name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-gray-900">
                      ₦{booking.price_total.toLocaleString()}
                    </p>
                    <button
                      onClick={() => handleViewDetails(booking)}
                      className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium text-sm"
                    >
                      <Eye className="h-4 w-4" />
                      Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      {showDetailsModal && selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 border-b border-gray-200 p-6 bg-white flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">
                Booking Details
              </h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-6">
              {/* Tracking ID */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-sm text-gray-600 mb-1">Tracking ID</p>
                <code className="text-2xl font-mono font-bold text-blue-900">
                  {selectedBooking.tracking_id}
                </code>
              </div>

              {/* Sender Info */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="h-5 w-5 text-blue-600" />
                  Sender Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium text-gray-900">
                      {selectedBooking.sender_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Phone className="h-4 w-4" /> Phone
                    </p>
                    <a
                      href={`tel:${selectedBooking.sender_phone}`}
                      className="font-medium text-blue-600 hover:text-blue-700"
                    >
                      {selectedBooking.sender_phone}
                    </a>
                  </div>
                  {selectedBooking.sender_whatsapp && (
                    <div>
                      <p className="text-sm text-gray-600">WhatsApp</p>
                      <a
                        href={`https://wa.me/${selectedBooking.sender_whatsapp.replace(
                          /\D/g,
                          ''
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-green-600 hover:text-green-700"
                      >
                        {selectedBooking.sender_whatsapp}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Pickup Location */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-blue-600" />
                  Pickup Location
                </h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-gray-600">Address:</span>
                    <span className="font-medium text-gray-900 ml-2">
                      {selectedBooking.pickup_address}
                    </span>
                  </p>
                  {selectedBooking.pickup_landmark && (
                    <p>
                      <span className="text-gray-600">Landmark:</span>
                      <span className="font-medium text-gray-900 ml-2">
                        {selectedBooking.pickup_landmark}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Receiver Info */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <User className="h-5 w-5 text-green-600" />
                  Receiver Information
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Name</p>
                    <p className="font-medium text-gray-900">
                      {selectedBooking.receiver_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 flex items-center gap-1">
                      <Phone className="h-4 w-4" /> Phone
                    </p>
                    <a
                      href={`tel:${selectedBooking.receiver_phone}`}
                      className="font-medium text-blue-600 hover:text-blue-700"
                    >
                      {selectedBooking.receiver_phone}
                    </a>
                  </div>
                  {selectedBooking.receiver_whatsapp && (
                    <div>
                      <p className="text-sm text-gray-600">WhatsApp</p>
                      <a
                        href={`https://wa.me/${selectedBooking.receiver_whatsapp.replace(
                          /\D/g,
                          ''
                        )}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-green-600 hover:text-green-700"
                      >
                        {selectedBooking.receiver_whatsapp}
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Dropoff Location */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-green-600" />
                  Dropoff Location
                </h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-gray-600">Address:</span>
                    <span className="font-medium text-gray-900 ml-2">
                      {selectedBooking.dropoff_address}
                    </span>
                  </p>
                  {selectedBooking.dropoff_landmark && (
                    <p>
                      <span className="text-gray-600">Landmark:</span>
                      <span className="font-medium text-gray-900 ml-2">
                        {selectedBooking.dropoff_landmark}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Item Info */}
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <PackageIcon className="h-5 w-5 text-purple-600" />
                  Item Information
                </h3>
                <div className="space-y-2 text-sm">
                  <p>
                    <span className="text-gray-600">Category:</span>
                    <span className="font-medium text-gray-900 ml-2">
                      {selectedBooking.item_category_id || 'N/A'}
                    </span>
                  </p>
                  {selectedBooking.item_notes && (
                    <p>
                      <span className="text-gray-600">Notes:</span>
                      <span className="font-medium text-gray-900 ml-2">
                        {selectedBooking.item_notes}
                      </span>
                    </p>
                  )}
                </div>
              </div>

              {/* Pricing */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-3">Pricing</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Base Price:</span>
                    <span className="font-medium">
                      ₦{selectedBooking.price_base.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Add-ons:</span>
                    <span className="font-medium">
                      ₦{selectedBooking.price_addons.toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t border-gray-200 pt-2 flex justify-between font-semibold">
                    <span>Total:</span>
                    <span className="text-lg">
                      ₦{selectedBooking.price_total.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              {/* Status History Timeline */}
              {bookingHistory.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <History className="h-5 w-5 text-blue-600" />
                    Status History
                  </h3>
                  <div className="space-y-3">
                    {bookingHistory.map((entry, idx) => (
                      <div key={entry.id} className="flex gap-3">
                        <div className="flex flex-col items-center">
                          <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
                            <div className="h-3 w-3 bg-blue-600 rounded-full"></div>
                          </div>
                          {idx < bookingHistory.length - 1 && (
                            <div className="w-0.5 h-8 bg-gray-200 mt-2"></div>
                          )}
                        </div>
                        <div className="flex-1 pt-1">
                          <p className="text-xs text-gray-600">
                            {new Date(entry.created_at).toLocaleString()}
                          </p>
                          <p className="text-sm font-medium text-gray-900">
                            {entry.note}
                          </p>
                          <p className="text-xs text-gray-500">
                            By: {entry.created_by}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Status Update Form */}
              <div className="border-t border-gray-200 pt-6">
                <h3 className="font-semibold text-gray-900 mb-4">
                  Update Status
                </h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Status
                    </label>
                    <select
                      value={newStatus}
                      onChange={(e) =>
                        setNewStatus(e.target.value as BookingStatus)
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Select Status</option>
                      {(newStatus === selectedBooking.status
                        ? statuses
                        : nextStatuses[selectedBooking.status] || []
                      ).map((status) => (
                        <option key={status} value={status}>
                          {getStatusLabel(status)}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rider Name (Optional)
                    </label>
                    <input
                      type="text"
                      value={riderName}
                      onChange={(e) => setRiderName(e.target.value)}
                      placeholder="e.g., John Doe"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rider Phone
                    </label>
                    <input
                      type="tel"
                      value={riderPhone}
                      onChange={(e) => setRiderPhone(e.target.value)}
                      placeholder="e.g., 08012345678"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Status Note (Optional)
                    </label>
                    <textarea
                      value={statusNote}
                      onChange={(e) => setStatusNote(e.target.value)}
                      placeholder="Add a note about this status change..."
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    ></textarea>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={handleUpdateStatus}
                      disabled={isUpdatingStatus}
                      className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 font-medium flex items-center justify-center gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {isUpdatingStatus ? 'Updating...' : 'Update Status'}
                    </button>
                    <button
                      onClick={handleSendSMS}
                      className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center justify-center gap-2"
                    >
                      <Send className="h-4 w-4" />
                      Send Tracking SMS
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-6 bg-gray-50">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminBookings;
