/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar.tsx';
import { Footer } from './components/Footer.tsx';
import { HeroSection } from './components/HeroSection.tsx';
import { HowItWorksSection } from './components/HowItWorksSection.tsx';
import { StylesGallerySection } from './components/StylesGallerySection.tsx';
import { FaqSection } from './components/FaqSection.tsx';
import { RequestBuilder } from './components/RequestBuilder/RequestBuilder.tsx';
import { SuccessScreen } from './components/SuccessScreen.tsx';
import { CustomerTracker } from './components/CustomerTracker.tsx';
import { AdminDashboard } from './components/Admin/AdminDashboard.tsx';
import { BudgetContactForm } from './components/BudgetContactForm/BudgetContactForm.tsx';
import { WelcomeScreen } from './components/Auth/WelcomeScreen.tsx';
import { PrivacyModal, TermsModal, DataDeletionModal, ContactModal } from './components/Modals/LegalModals.tsx';
import { DownloadAppBottomBar } from './components/DownloadApp/DownloadAppBottomBar.tsx';
import { DownloadPage } from './components/DownloadApp/DownloadPage.tsx';
import { DesktopUpdateBanner } from './components/DownloadApp/DesktopUpdateBanner.tsx';
import { hasEnteredStudio, enterStudio } from './services/deviceIdentity.ts';
import { ensureClientStorageReset } from './services/firestoreService.ts';

type MainView =
  | 'landing'
  | 'builder'
  | 'success'
  | 'tracker'
  | 'budget_contact'
  | 'download';

export default function App() {
  const [hasEntered, setHasEntered] = useState<boolean>(() => {
    ensureClientStorageReset();
    return hasEnteredStudio();
  });
  const [isGuestDownloadOpen, setIsGuestDownloadOpen] = useState<boolean>(false);

  const [currentView, setCurrentView] = useState<MainView>('landing');
  const [selectedStyle, setSelectedStyle] = useState<string>('Realistic cinematic');
  const [submittedRequest, setSubmittedRequest] = useState<any | null>(null);

  // Tracker state
  const [trackParams, setTrackParams] = useState<{ id?: string; token?: string }>({});

  // Modals
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isPrivacyOpen, setIsPrivacyOpen] = useState(false);
  const [isTermsOpen, setIsTermsOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);

  // Check URL query parameters & private admin route (/admin, /admin-login, ?admin=true)
  useEffect(() => {
    try {
      const urlParams = new URLSearchParams(window.location.search);
      const id = urlParams.get('id');
      const token = urlParams.get('token');
      const admin = urlParams.get('admin');
      const budget = urlParams.get('budget');
      const download = urlParams.get('download');

      if (
        admin === 'true' ||
        window.location.pathname === '/admin' ||
        window.location.pathname === '/admin-login'
      ) {
        setIsAdminOpen(true);
      }

      if (download === 'true' || window.location.pathname === '/download') {
        setIsGuestDownloadOpen(true);
        setCurrentView('download');
      }

      if (budget === 'true') {
        enterStudio();
        setHasEntered(true);
        setCurrentView('budget_contact');
      }

      if (id || window.location.pathname === '/track') {
        enterStudio();
        setHasEntered(true);
        if (id) {
          setTrackParams({ id, token: token || '' });
        }
        setCurrentView('tracker');
      }
    } catch {
      // ignore
    }
  }, []);

  const handleSignIn = () => {
    enterStudio();
    setHasEntered(true);
    setIsGuestDownloadOpen(false);
    setCurrentView('landing');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigate = (sectionId: string) => {
    if (currentView !== 'landing') {
      setCurrentView('landing');
      setTimeout(() => {
        const el = document.getElementById(sectionId);
        if (el) el.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      const el = document.getElementById(sectionId);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleStartRequest = (styleName?: string) => {
    if (styleName) {
      setSelectedStyle(styleName);
    }
    setCurrentView('builder');
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 50);
  };

  const handleOpenBudgetContact = () => {
    setCurrentView('budget_contact');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenTracker = (id?: string, token?: string) => {
    if (id) {
      setTrackParams({ id, token: token || '' });
    }
    setCurrentView('tracker');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleOpenDownloadPage = () => {
    setIsGuestDownloadOpen(true);
    setCurrentView('download');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleRequestSubmitted = (created: any) => {
    setSubmittedRequest(created);
    setCurrentView('success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Private admin view renders independently if visited via /admin or /admin-login or ?admin=true
  if (isAdminOpen) {
    return (
      <div className="min-h-screen bg-[#050811]">
        <AdminDashboard
          onClose={() => {
            setIsAdminOpen(false);
            if (
              window.location.pathname === '/admin' ||
              window.location.pathname === '/admin-login' ||
              window.location.search.includes('admin=true')
            ) {
              window.history.replaceState(null, '', '/');
            }
          }}
        />
      </div>
    );
  }

  // Opening welcome screen with immediate SIGN IN button (no customer login required)
  if (!hasEntered) {
    return (
      <div className="min-h-screen pb-24 relative bg-[#050811]">
        <DesktopUpdateBanner />
        {isGuestDownloadOpen ? (
          <DownloadPage onBack={() => setIsGuestDownloadOpen(false)} />
        ) : (
          <WelcomeScreen onSignIn={handleSignIn} />
        )}
        <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
        <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
        <DownloadAppBottomBar
          onOpenDownloadPage={handleOpenDownloadPage}
          isOnDownloadPage={isGuestDownloadOpen}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-24 bg-[#050811] text-slate-100 flex flex-col selection:bg-indigo-600/30 selection:text-white">
      <DesktopUpdateBanner />
      {/* Global Navbar (Customer-only, no admin links) */}
      <Navbar
        onNavigate={handleNavigate}
        onRequestClick={() => handleStartRequest()}
        onTrackClick={() => handleOpenTracker()}
        onContactClick={() => setIsContactOpen(true)}
        onBudgetContactClick={handleOpenBudgetContact}
        onDownloadAppClick={handleOpenDownloadPage}
      />

      {/* Main View Router */}
      <main className="flex-1">
        {currentView === 'landing' && (
          <>
            <HeroSection
              onRequestClick={() => handleStartRequest()}
              onExploreStylesClick={() => handleNavigate('video-styles')}
              onTrackClick={() => handleOpenTracker()}
            />
            <HowItWorksSection onRequestClick={() => handleStartRequest()} />
            <StylesGallerySection
              onSelectStyle={(styleTitle) => handleStartRequest(styleTitle)}
            />

            {/* Direct Contact & Budget Form Section */}
            <div className="border-t border-slate-800/80">
              <BudgetContactForm />
            </div>

            {/* Embedded direct builder teaser */}
            <div className="py-16 bg-[#070B14] border-t border-slate-800/80 text-center px-4">
              <div className="max-w-2xl mx-auto space-y-4">
                <span className="text-xs uppercase font-extrabold tracking-widest text-indigo-400">
                  Ready to Craft Your Custom AI Video?
                </span>
                <h3 className="text-3xl font-black text-white">
                  Launch the Studio Video Request Builder
                </h3>
                <p className="text-sm text-slate-300">
                  Describe your story, specify character consistency photos, and submit your request. The payment will be based on the video.
                </p>
                <div className="pt-2">
                  <button
                    onClick={() => handleStartRequest()}
                    className="px-8 py-4 rounded-xl text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 shadow-xl shadow-indigo-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
                  >
                    Create My AI Video Request &rarr;
                  </button>
                </div>
              </div>
            </div>

            <FaqSection />
          </>
        )}

        {currentView === 'budget_contact' && (
          <div className="py-8 bg-[#050811]">
            <BudgetContactForm onBackToHome={() => setCurrentView('landing')} />
          </div>
        )}

        {currentView === 'builder' && (
          <div className="py-8 bg-[#050811]">
            <RequestBuilder
              initialStyle={selectedStyle}
              onSuccess={handleRequestSubmitted}
              onOpenPrivacy={() => setIsPrivacyOpen(true)}
              onOpenTerms={() => setIsTermsOpen(true)}
            />
          </div>
        )}

        {currentView === 'success' && submittedRequest && (
          <SuccessScreen
            request={submittedRequest}
            onTrack={(id, token) => handleOpenTracker(id, token)}
            onHome={() => {
              setCurrentView('landing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            onNewRequest={() => {
              setCurrentView('builder');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'tracker' && (
          <CustomerTracker
            initialRequestId={trackParams.id}
            initialToken={trackParams.token}
            onBack={() => {
              setCurrentView('landing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}

        {currentView === 'download' && (
          <DownloadPage
            onBack={() => {
              setCurrentView('landing');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
          />
        )}
      </main>

      {/* Global Footer (Customer-only, no admin links) */}
      <Footer
        onNavigate={handleNavigate}
        onRequestClick={() => handleStartRequest()}
        onTrackClick={() => handleOpenTracker()}
        onPrivacyClick={() => setIsPrivacyOpen(true)}
        onTermsClick={() => setIsTermsOpen(true)}
        onDeleteRequestClick={() => setIsDeleteOpen(true)}
        onContactClick={() => setIsContactOpen(true)}
        onBudgetContactClick={handleOpenBudgetContact}
        onDownloadAppClick={handleOpenDownloadPage}
      />

      {/* Trust & Legal Modals */}
      <PrivacyModal isOpen={isPrivacyOpen} onClose={() => setIsPrivacyOpen(false)} />
      <TermsModal isOpen={isTermsOpen} onClose={() => setIsTermsOpen(false)} />
      <DataDeletionModal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} />
      <ContactModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />

      {/* Permanent Fixed Bottom Download Our App Bar */}
      <DownloadAppBottomBar
        onOpenDownloadPage={handleOpenDownloadPage}
        isOnDownloadPage={currentView === 'download'}
      />
    </div>
  );
}
