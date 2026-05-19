import type { AuthUser } from '@/context/auth-context';

export type AuthRedirectOptions = {
  /** Na registratie als model: door naar modellenfiche om profiel te vervolledigen. */
  fromRegister?: boolean;
};

export function applyPostLoginRedirect(
  u: AuthUser,
  router: { replace: (href: string) => void },
  opts: AuthRedirectOptions & { next?: string | null } = {},
) {
  const next = opts.next;
  if (next && next.startsWith('/') && !next.startsWith('//')) {
    router.replace(next);
    return;
  }
  redirectAfterPortalAuth(u, router, opts);
}

export function redirectAfterPortalAuth(
  u: AuthUser,
  router: { replace: (href: string) => void },
  opts: AuthRedirectOptions = {},
) {
  if (u.mustChangePassword) {
    router.replace('/account/nieuw-wachtwoord');
    return;
  }
  const p = u.permissions ?? [];
  const toBackoffice = p.includes('*') || p.some((x) => x.startsWith('admin.'));
  const contentOnly = p.includes('content.strings.write') && !toBackoffice;
  const photographerOnly =
    p.includes('photographer.portfolio.upload') && !toBackoffice && !contentOnly;
  if (toBackoffice) {
    router.replace('/admin/dashboard');
    return;
  }
  if (photographerOnly) {
    router.replace('/photographer');
    return;
  }
  if (contentOnly) {
    router.replace('/admin/content');
    return;
  }
  if (u.roles.includes('model')) {
    if (opts.fromRegister) {
      router.replace('/portal/model?tab=profiel&welcome=1');
      return;
    }
    router.replace('/portal/model');
    return;
  }
  if (u.roles.includes('client')) {
    router.replace('/portal/client');
    return;
  }
  router.replace('/');
}
