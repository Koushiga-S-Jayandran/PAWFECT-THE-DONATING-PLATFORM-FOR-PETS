import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  User,
  Phone,
  Mail,
  MapPin,
  Camera,
  Save,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  Shield,
  Clock,
  Heart,
} from 'lucide-react';
import { Header } from '../../ui/components/Header.js';
import { Footer } from '../../ui/components/Footer.js';
import { petAdoptionService } from '../../services/PetAdoptionService.js';
import { useAuth } from '../../context/AuthContext.js';
import type { AdopterProfile, AdoptionRequest } from '../../domain/petEntities.js';
import { ROUTES } from '../../config/constants.js';

export const AdopterProfilePage: React.FC = () => {
  const { user, profile, refreshProfile, logout } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [city, setCity] = useState<string>('');
  const [photoURL, setPhotoURL] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Request history summary
  const [requests, setRequests] = useState<AdoptionRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState<boolean>(true);

  // Account deletion modal state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [deletePassword, setDeletePassword] = useState<string>('');
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.uid) {
      petAdoptionService
        .getAdopterProfile(user.uid)
        .then((p) => {
          if (p) {
            setName(p.name);
            setPhone(p.phone);
            setCity(p.city);
            setPhotoURL(p.photoURL || '');
          } else if (profile) {
            setName(profile.name || profile.fullName || '');
            setPhone(profile.phone || '');
            setCity(profile.city || '');
            setPhotoURL(profile.photoURL || '');
          }
        })
        .catch(console.warn);

      // Fetch request history
      const unsub = petAdoptionService.subscribeToAdopterRequests(
        user.uid,
        (reqs) => {
          setRequests(reqs);
          setLoadingRequests(false);
        }
      );

      return () => unsub();
    }
  }, [user?.uid, profile]);

  // Client-side image compression (< 5MB)
  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setSaveError('Photo size must be less than 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 600;
        const MAX_HEIGHT = 600;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
        setPhotoURL(compressedDataUrl);
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;

    setIsSaving(true);
    setSaveError(null);
    setSaveSuccess(false);

    try {
      await petAdoptionService.updateAdopterProfile(user.uid, {
        name: name.trim(),
        phone: phone.trim(),
        city: city.trim(),
        photoURL,
      });

      await refreshProfile();
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      console.error('Failed to update profile:', err);
      setSaveError(err?.message || 'Could not save profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!user) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      await petAdoptionService.deleteAdopterAccount(
        user as any,
        deletePassword || undefined
      );
      await logout();
      navigate(ROUTES.HOME);
    } catch (err: any) {
      console.error('Account deletion error:', err);
      if (err?.code === 'auth/wrong-password') {
        setDeleteError('Incorrect password. Please verify and try again.');
      } else if (err?.code === 'auth/requires-recent-login') {
        setDeleteError('Security requires you to re-authenticate with your password.');
      } else {
        setDeleteError(err?.message || 'Failed to delete account. Please try again.');
      }
    } finally {
      setIsDeleting(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;

  return (
    <div className="flex min-h-screen flex-col bg-[#FAF7F2] text-[#231A1D]">
      <Header />

      <main className="mx-auto flex-1 w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Page Header */}
        <div className="mb-8">
          <span className="inline-block rounded-full bg-[#F3E3E8] px-3 py-0.5 text-xs font-semibold uppercase tracking-wider text-[#7B1E3A]">
            Account Management
          </span>
          <h1 className="mt-2 font-serif text-3xl font-bold tracking-tight text-[#231A1D]">
            Adopter Profile
          </h1>
          <p className="mt-1 text-sm text-[#6B5B61]">
            Manage your personal contact details, verified adoption statistics, and security preferences.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-8 md:grid-cols-12">
          {/* Left Column: Form & Avatar (8 cols) */}
          <div className="md:col-span-8 space-y-6">
            <div className="rounded-3xl border border-[#E7DEDF] bg-white p-6 shadow-xs">
              <h2 className="font-serif text-lg font-bold text-[#231A1D]">
                Personal Details
              </h2>

              {saveSuccess && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Profile updated successfully.
                </div>
              )}

              {saveError && (
                <div className="mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                  {saveError}
                </div>
              )}

              <form onSubmit={handleSaveProfile} className="mt-6 space-y-5">
                {/* Avatar Row */}
                <div className="flex items-center gap-5">
                  <div className="relative">
                    <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full border-2 border-[#7B1E3A] bg-[#FAF7F2]">
                      {photoURL ? (
                        <img
                          src={photoURL}
                          alt="Avatar"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <User className="h-10 w-10 text-[#6B5B61]" />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 flex h-7 w-7 items-center justify-center rounded-full bg-[#7B1E3A] text-white shadow-xs hover:bg-[#63182E]"
                      title="Upload photo (< 5MB)"
                    >
                      <Camera className="h-3.5 w-3.5" />
                    </button>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      className="hidden"
                    />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-[#231A1D]">
                      Profile Photo
                    </h3>
                    <p className="text-xs text-[#6B5B61]">
                      PNG, JPG or WEBP under 5MB. Automatically compressed.
                    </p>
                  </div>
                </div>

                {/* Name */}
                <div>
                  <label className="text-xs font-semibold text-[#231A1D]">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. Anand Kumar"
                    className="mt-1.5 w-full rounded-xl border border-[#E7DEDF] p-3 text-sm focus:border-[#7B1E3A] focus:outline-none focus:ring-1 focus:ring-[#7B1E3A]"
                  />
                </div>

                {/* Email (Read-only) */}
                <div>
                  <label className="text-xs font-semibold text-[#231A1D]">
                    Email Address
                  </label>
                  <div className="mt-1.5 flex items-center gap-2 rounded-xl border border-[#E7DEDF] bg-gray-50 p-3 text-sm text-gray-500">
                    <Mail className="h-4 w-4 text-gray-400" />
                    <span>{user?.email}</span>
                  </div>
                  <span className="text-[11px] text-[#6B5B61]">
                    Managed through Firebase Authentication
                  </span>
                </div>

                {/* Phone & City */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <div>
                    <label className="text-xs font-semibold text-[#231A1D]">
                      Phone Number
                    </label>
                    <div className="relative mt-1.5">
                      <Phone className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        className="w-full rounded-xl border border-[#E7DEDF] p-3 pl-10 text-sm focus:border-[#7B1E3A] focus:outline-none focus:ring-1 focus:ring-[#7B1E3A]"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-[#231A1D]">
                      City
                    </label>
                    <div className="relative mt-1.5">
                      <MapPin className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                      <input
                        type="text"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. Chennai"
                        className="w-full rounded-xl border border-[#E7DEDF] p-3 pl-10 text-sm focus:border-[#7B1E3A] focus:outline-none focus:ring-1 focus:ring-[#7B1E3A]"
                      />
                    </div>
                  </div>
                </div>

                {/* Save Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="inline-flex items-center gap-2 rounded-xl bg-[#7B1E3A] px-6 py-2.5 text-sm font-semibold text-white shadow-xs hover:bg-[#63182E] disabled:opacity-50"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" /> Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" /> Save Profile
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>

            {/* Danger Zone: Account Deletion */}
            <div className="rounded-3xl border border-rose-200 bg-white p-6 shadow-xs">
              <h2 className="font-serif text-lg font-bold text-rose-800">
                Danger Zone
              </h2>
              <p className="mt-1 text-xs text-[#6B5B61]">
                Permanently delete your account, withdraw all active adoption applications,
                and remove your saved pets and notifications.
              </p>
              <div className="mt-4">
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-rose-300 bg-rose-50 px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-100"
                >
                  <Trash2 className="h-4 w-4" /> Delete Account
                </button>
              </div>
            </div>
          </div>

          {/* Right Column: Adoption Activity Summary (4 cols) */}
          <div className="md:col-span-4 space-y-6">
            <div className="rounded-3xl border border-[#E7DEDF] bg-white p-6 shadow-xs">
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-[#7B1E3A]" />
                <h3 className="font-serif text-base font-bold text-[#231A1D]">
                  Application Activity
                </h3>
              </div>

              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between rounded-xl bg-[#FAF7F2] p-3 text-xs">
                  <span className="flex items-center gap-2 text-[#6B5B61]">
                    <Clock className="h-4 w-4 text-amber-600" /> Under Review
                  </span>
                  <strong className="text-sm font-bold text-[#231A1D]">
                    {pendingCount}
                  </strong>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#FAF7F2] p-3 text-xs">
                  <span className="flex items-center gap-2 text-[#6B5B61]">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" /> Approved
                  </span>
                  <strong className="text-sm font-bold text-[#231A1D]">
                    {approvedCount}
                  </strong>
                </div>

                <div className="flex items-center justify-between rounded-xl bg-[#FAF7F2] p-3 text-xs">
                  <span className="flex items-center gap-2 text-[#6B5B61]">
                    <Heart className="h-4 w-4 text-[#7B1E3A]" /> Total Submitted
                  </span>
                  <strong className="text-sm font-bold text-[#231A1D]">
                    {requests.length}
                  </strong>
                </div>
              </div>

              <div className="mt-6 border-t border-[#E7DEDF]/60 pt-4 text-center">
                <button
                  type="button"
                  onClick={() => navigate(ROUTES.MY_ADOPTIONS)}
                  className="text-xs font-semibold text-[#7B1E3A] hover:underline"
                >
                  View Full Request History →
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Account Deletion Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-xs"
            onClick={() => !isDeleting && setIsDeleteModalOpen(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-3xl border border-rose-200 bg-white p-6 shadow-2xl">
            <h3 className="font-serif text-xl font-bold text-rose-800">
              Confirm Account Deletion
            </h3>
            <p className="mt-2 text-xs text-[#6B5B61] leading-relaxed">
              This will permanently delete your adopter profile, cancel any pending
              adoption requests, and wipe all saved pets. This action is irreversible.
            </p>

            {deleteError && (
              <div className="mt-3 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-2 text-xs text-rose-800">
                <AlertTriangle className="h-3.5 w-3.5 text-rose-600 shrink-0" />
                {deleteError}
              </div>
            )}

            <div className="mt-4">
              <label className="text-xs font-semibold text-[#231A1D]">
                Enter Your Password to Confirm
              </label>
              <input
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                placeholder="Account password"
                className="mt-1 w-full rounded-xl border border-[#E7DEDF] p-2.5 text-xs focus:border-rose-600 focus:outline-none focus:ring-1 focus:ring-rose-600"
              />
            </div>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                disabled={isDeleting}
                className="rounded-xl border border-[#E7DEDF] px-4 py-2 text-xs font-semibold text-[#6B5B61] hover:bg-[#FAF7F2]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isDeleting || !deletePassword}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-rose-700 disabled:opacity-50"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Deleting...
                  </>
                ) : (
                  'Permanently Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
};
