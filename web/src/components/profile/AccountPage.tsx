'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useCloudSyncStatus } from '@/lib/cloud-sync';
import { useAuth } from '@/lib/auth';
import { openLoginDialog } from '@/lib/login-dialog';
import { useProfile } from '@/lib/use-store';
import { useProfileModal } from './ProfileModal';
import { usePreferences, savePreferences } from '@/lib/preferences';
import { formatDob } from '@/lib/utils';
import { usePointsBalance, refreshPoints } from '@/lib/points';
import { TopupPanel } from '@/components/topup/TopupPanel';
import { FeatureIcon } from '@/components/kit/FeatureIcon';
import { useToast } from '@/components/motion';
import { PointsHome } from '@/components/points/PointsHome';
import { moduleRoute, visibleModules } from '@/lib/locale';
import { useLocale } from '@/i18n/LocaleProvider';
import styles from './AccountPage.module.css';

export function AccountPage() {
  const t = useLocale();
  const profileHref = moduleRoute('profile', t.locale);
  const exploreLinks = (['tuvi', 'tarot', 'zodiac', 'kinhdich', 'batu', 'numerology'] as const)
    .filter(id => visibleModules(t.locale).some(m => m.id === id))
    .map(id => [t.t(`nav.${id}`), moduleRoute(id, t.locale)] as const);
  const syncStatus = useCloudSyncStatus();
  const search = useSearchParams();
  const selected = search.get('section');
  const section = ['personal', 'account', 'preferences', 'points', 'earn'].includes(selected || '') ? selected : null;
  const titles: Record<string, string> = {
    personal: t.t('account.personal'),
    account: t.t('account.account'),
    preferences: t.t('account.preferences'),
    points: t.t('account.points'),
    earn: t.t('account.earn'),
  };
  const profile = useProfile();
  const { open } = useProfileModal();
  const { loggedIn, ready, displayName, astroxUser, logout } = useAuth();
  const settings = usePreferences();
  const preview = astroxUser?.id === 'localhost-preview';
  const { points, status: pointsStatus, refresh: refreshBalance } = usePointsBalance(!preview);
  const pointsError = pointsStatus === 'error' && points === null;
  const [topup, setTopup] = useState(false);
  const [message, setMessage] = useState('');
  const [loggingOut, setLoggingOut] = useState(false);
  const toast = useToast();
  const lastTopupFlag = useRef('');
  useEffect(() => {
    if (!astroxUser || preview) return;
    void refreshPoints();
  }, [astroxUser, preview]);
  // Quay về từ PayOS: cập nhật số dư ngay + báo kết quả một lần cho mỗi lần nạp.
  useEffect(() => {
    if (preview || !ready || !loggedIn) return;
    const flag =
      search.get('cancel') === 'true' || search.get('status') === 'CANCELLED'
        ? 'cancelled'
        : search.get('topup') || (search.get('status') === 'PAID' ? 'success' : null);
    if (!flag || lastTopupFlag.current === flag) return;
    lastTopupFlag.current = flag;
    if (flag === 'success') {
      void refreshPoints(true);
      toast.show(t.t('toast.topupReturn'), 'success');
    } else if (flag === 'cancelled' || flag === 'cancel') {
      toast.show(t.t('toast.topupCancelled'), 'info');
    }
  }, [search, toast, preview, ready, loggedIn, t]);
  const update = (patch: Parameters<typeof savePreferences>[0]) => {
    try {
      savePreferences(patch);
      setMessage(t.t('prefs.savedOk'));
    } catch {
      setMessage(t.t('prefs.saveFail'));
    }
  };
  const name = loggedIn
    ? profile?.name || displayName || t.t('account.yourAccountDefault')
    : t.t('account.guestWelcome');
  return (
    <div className={styles.page}>
      <h1 className="sr-only">{t.t('nav.profile')}</h1>
      {!section ? (
        <div className={styles.accountHome}>
          <header className={`${styles.identity} ${!loggedIn ? styles.guestIdentity : ''}`}>
            <span className={styles.avatar} aria-hidden="true">
              {loggedIn ? name.slice(0, 1).toUpperCase() : <FeatureIcon name="profile" size={28} />}
            </span>
            <div>
              <span className={styles.authStatus} role="status">
                {!ready
                  ? t.t('dash.checkingLogin')
                  : loggedIn
                    ? preview
                      ? t.t('auth.preview')
                      : astroxUser
                        ? t.t(astroxUser.provider === 'google' ? 'account.signedInGoogle' : 'account.signedInZalo')
                        : t.t('auth.signedIn')
                    : t.t('dash.notSignedIn')}
              </span>
              <h2>{name}</h2>
              {loggedIn && <p>{t.t('account.manageHint')}</p>}
              {loggedIn && !preview && (
                <p role="status" className={styles.syncStatus}>
                  {syncStatus}
                </p>
              )}
            </div>
            {ready &&
              (loggedIn ? (
                <Link className={styles.identityEdit} href={`${profileHref}?section=personal`}>
                  {profile ? t.t('account.edit') : t.t('account.setup')} ↗
                </Link>
              ) : (
                <div className={styles.loginAction}>
                  <button className={styles.primaryLogin} onClick={openLoginDialog}>
                    {t.t('auth.login')}
                  </button>
                </div>
              ))}
          </header>
          <nav className={styles.accountMenu} aria-label={t.t('account.manageMenuAria')}>
            <Link href={`${profileHref}?section=personal`}>
              <span className={styles.menuIcon}>
                <FeatureIcon name="profile" size={23} />
              </span>
              <div>
                <h2>{t.t('account.personal')}</h2>
                <p>{t.t('account.personalHint')}</p>
              </div>
              <span aria-hidden="true">↗</span>
            </Link>
            <Link href={`${profileHref}?section=points`}>
              <span className={`${styles.menuIcon} ${styles.menuIconPoint}`}>
                <FeatureIcon name="wallet" size={23} />
              </span>
              <div>
                <h2>{t.t('account.points')}</h2>
                <p>{t.t('account.pointsHint')}</p>
              </div>
              <span aria-hidden="true">↗</span>
            </Link>
            <Link href={`${profileHref}?section=account`}>
              <span className={styles.menuIcon}>
                <FeatureIcon name="settings" size={23} />
              </span>
              <div>
                <h2>{t.t('account.account')}</h2>
                <p>{t.t('account.accountHint')}</p>
              </div>
              <span aria-hidden="true">↗</span>
            </Link>
            <Link href={`${profileHref}?section=preferences`}>
              <span className={styles.menuIcon}>
                <FeatureIcon name="motion" size={23} />
              </span>
              <div>
                <h2>{t.t('account.preferences')}</h2>
                <p>{t.t('account.preferencesHint')}</p>
              </div>
              <span aria-hidden="true">↗</span>
            </Link>
          </nav>
          <section className={styles.section} aria-label={t.t('account.aboutAstrox')}>
            <header>
              <h2>
                <FeatureIcon name="home" size={22} />
                {t.t('account.aboutAstrox')}
              </h2>
            </header>
            <div className={styles.brand}>
              <Link href={moduleRoute('home', t.locale)} aria-label="AstroX" className={styles.logo}>
                {/* eslint-disable-next-line @next/next/no-img-element -- static export, logo PNG tĩnh */}
                <img src="/assets/logo.png" alt="AstroX" width={1254} height={1254} />
              </Link>
              <div>
                <p className={styles.tagline}>{t.t('account.tagline')}</p>
                <p className={styles.brandNote}>{t.t('account.brandNote')}</p>
              </div>
            </div>
            <nav aria-label={t.t('account.exploreWith')} className={styles.explore}>
              <p>{t.t('account.exploreWith')}</p>
              <div className={styles.exploreGrid}>
                {exploreLinks.map(([title, href]) => (
                  <Link href={href} key={href}>
                    {title}
                    <span aria-hidden="true">↗</span>
                  </Link>
                ))}
              </div>
            </nav>
            <Link className={styles.termsLink} href={moduleRoute('terms', t.locale)}>
              {t.t('account.termsFull')}
              <span aria-hidden="true">↗</span>
            </Link>
            <div className={styles.aboutBottom}>
              <span>© {new Date().getFullYear()} AstroX</span>
              <span className={styles.credit}>
                Designed &amp; Developed by <strong>Tsonniverse Studio™</strong>
              </span>
            </div>
          </section>
        </div>
      ) : (
        <div key={section} className={styles.accountDetail}>
          <header className={styles.detailHeading}>
            <Link
              href={section === 'earn' ? `${profileHref}?section=points` : profileHref}
              aria-label={section === 'earn' ? t.t('account.backToPoints') : t.t('account.backToProfile')}
            >
              ←
            </Link>
            <h2>{titles[section]}</h2>
          </header>
          {section === 'personal' && (
            <>
              <section className={styles.section}>
                <header>
                  <h2>
                    <FeatureIcon name="profile" size={22} />
                    {t.t('account.personal')}
                  </h2>
                  <button className={styles.editProfile} onClick={() => open()}>
                    {profile ? t.t('account.edit') : t.t('account.setup')} ↗
                  </button>
                </header>
                {profile ? (
                  <dl className={styles.details}>
                    {[
                      ['account.nickname', profile.name],
                      ['account.fullName', profile.fullName || t.t('account.notProvided')],
                      ['account.gender', profile.gender],
                      ['account.dob', profile.dob ? formatDob(profile.dob) : t.t('account.notProvided')],
                      [
                        'account.birthHour',
                        profile.birthTime
                          ? `${profile.birthTime} · ${profile.hourChi}`
                          : profile.hourChi || t.t('account.notProvided'),
                      ],
                      ['account.birthPlace', profile.place || t.t('account.notProvided')],
                    ].map(([label, value]) => (
                      <div key={label}>
                        <dt>{t.t(label)}</dt>
                        <dd>{value}</dd>
                      </div>
                    ))}
                  </dl>
                ) : (
                  <div className={styles.empty}>
                    <p>{t.t('account.emptyProfileHint')}</p>
                    <button onClick={() => open()}>{t.t('account.setupProfile')} ↗</button>
                  </div>
                )}
              </section>
            </>
          )}
          {section === 'account' && (
            <>
              <section className={styles.section}>
                <header>
                  <h2>
                    <FeatureIcon name="wallet" size={22} />
                    {t.t('account.account')}
                  </h2>
                </header>
                {loggedIn ? (
                  <>
                    <div className={styles.row}>
                      <div>
                        <h3>{t.t('account.currentAccount')}</h3>
                        <p>
                          {preview
                            ? t.t('account.previewAccount')
                            : astroxUser
                              ? t.t(astroxUser.provider === 'google' ? 'account.google' : 'account.zalo')
                              : t.t('account.astroxAccount')}
                        </p>
                      </div>
                      <span className={styles.connected}>{t.t('auth.signedIn')}</span>
                    </div>
                    {astroxUser && (
                      <div className={styles.row}>
                        <div>
                          <h3>{t.t('account.points')}</h3>
                          <p>{t.t('account.pointDesc')}</p>
                          <p>
                            {preview
                              ? t.t('account.balanceIllustration')
                              : pointsError
                                ? t.t('auth.loadFailed')
                                : points === null
                                  ? t.t('common.loading')
                                  : `${t.formatNumber(points)} ${t.t('auth.unit')}`}
                          </p>
                        </div>
                        <span className={styles.rowActions}>
                          <Link className={styles.rowLink} href={`${profileHref}?section=points`}>
                            {t.t('account.walletLink')} ↗
                          </Link>
                          <button disabled={preview} onClick={() => setTopup(true)}>
                            {preview ? t.t('auth.preview') : `${t.t('auth.topup')} ↗`}
                          </button>
                        </span>
                      </div>
                    )}
                    <button
                      className={styles.logout}
                      disabled={loggingOut}
                      onClick={async () => {
                        if (!confirm(t.t('auth.logoutConfirm'))) return;
                        setLoggingOut(true);
                        try {
                          await logout();
                        } finally {
                          setLoggingOut(false);
                        }
                      }}
                    >
                      {loggingOut ? t.t('auth.loggingOut') : t.t('auth.logout')}
                    </button>
                  </>
                ) : (
                  <div className={styles.row}>
                    <div>
                      <h3>{t.t('account.points')}</h3>
                      <p>{t.t('account.loginToSeeBalance')}</p>
                    </div>
                    <button onClick={openLoginDialog} disabled={!ready}>
                      {t.t('auth.login')} ↗
                    </button>
                  </div>
                )}
              </section>
            </>
          )}
          {(section === 'points' || section === 'earn') && (
            <PointsHome key={astroxUser?.id ?? 'guest'} view={section === 'earn' ? 'earn' : 'wallet'} />
          )}
          {section === 'preferences' && (
            <>
              <section className={styles.section}>
                <header>
                  <h2>
                    <FeatureIcon name="settings" size={22} />
                    {t.t('account.preferences')}
                  </h2>
                </header>
                <div className={styles.row}>
                  <div>
                    <h3>
                      <FeatureIcon name="motion" size={19} />
                      {t.t('prefs.reducedMotion')}
                    </h3>
                    <p>{t.t('prefs.reducedMotionDesc')}</p>
                  </div>
                  <button
                    role="switch"
                    aria-checked={settings.motion === 'reduced'}
                    aria-label={t.t('prefs.reducedMotion')}
                    className={styles.toggle}
                    onClick={() => update({ motion: settings.motion === 'reduced' ? 'system' : 'reduced' })}
                  >
                    <i />
                  </button>
                </div>
                <label className={styles.row}>
                  <div>
                    <h3>
                      <FeatureIcon name="text" size={19} />
                      {t.t('prefs.readingSize')}
                    </h3>
                    <p>{t.t('prefs.readingSizeDesc')}</p>
                  </div>
                  <select
                    value={settings.readingSize}
                    onChange={e => update({ readingSize: e.target.value as 'normal' | 'large' })}
                  >
                    <option value="normal">{t.t('prefs.standard')}</option>
                    <option value="large">{t.t('prefs.large')}</option>
                  </select>
                </label>
                <label className={styles.row}>
                  <div>
                    <h3>
                      <FeatureIcon name="calendar" size={19} />
                      {t.t('prefs.defaultPeriod')}
                    </h3>
                    <p>{t.t('prefs.defaultPeriodDesc')}</p>
                  </div>
                  <select
                    value={settings.period}
                    onChange={e => update({ period: e.target.value as 'today' | 'week' | 'month' })}
                  >
                    <option value="today">{t.t('prefs.periodToday')}</option>
                    <option value="week">{t.t('prefs.periodWeek')}</option>
                    <option value="month">{t.t('prefs.periodMonth')}</option>
                  </select>
                </label>
              </section>
              <p className={styles.saved} role="status">
                {message || t.t('prefs.savedLocal')}
              </p>
            </>
          )}
          {loggedIn && !preview && (
            <p role="status" className={styles.syncStatus}>
              {syncStatus}
            </p>
          )}
        </div>
      )}
      <TopupPanel
        open={topup}
        onClose={() => {
          setTopup(false);
          void refreshBalance();
        }}
      />
    </div>
  );
}
