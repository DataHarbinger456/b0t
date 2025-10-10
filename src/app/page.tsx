import { redirect } from 'next/navigation';

export default function HomePage() {
  // Redirect to dashboard as the default page
  redirect('/dashboard');
}
