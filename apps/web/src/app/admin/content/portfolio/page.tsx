import { redirect } from 'next/navigation';

/** Oude link → centrale teksten-editor, portfolio-sectie. */
export default function AdminPortfolioContentRedirect() {
  redirect('/admin/content?section=model-portfolio');
}
