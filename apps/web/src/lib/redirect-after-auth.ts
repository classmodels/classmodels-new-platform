import type { AuthUser } from '@/context/auth-context';

export type AuthRedirectOptions = {
  /** Na registratie als model: door naar modellenfiche om profiel te vervolledigen. */
  fromRegister?: boolean;
};

export function redirectAfterPortalAuth(
  u: AuthUser,
  router: { replace: (href: string) => void },
  opts: AuthRedirectOptions = {},
) {
  const p = u.permissions ?? [];
  const toBackoffice = p.includes('*') || p.some((x) => x.startsWith('admin.'));
  const contentOnly = p.includes('content.strings.write') && !toBackoffice;
  if (toBackoffice) {
    router.replace('/admin/dashboard');
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
