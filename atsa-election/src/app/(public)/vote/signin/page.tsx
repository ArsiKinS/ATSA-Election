import SignIn from '@/components/SignIn';
export default async function SignInPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return token && /^[0-9a-f]{64}$/.test(token) ? <SignIn token={token} /> : <div className="note r">This link is not valid. Please request a new one on the Vote page.</div>;
}
