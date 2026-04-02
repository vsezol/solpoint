import { notFound, redirect } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { createClient } from "@/lib/supabase/server";
import { isProfileQrEnabled } from "@/lib/qr/feature-flags";
import { resolveProfileQrTarget } from "@/lib/qr/profile";
import { ProfileQrLanding } from "./profile-qr-landing";

interface ProfileQrPageProps {
  params: Promise<{ token: string }>;
}

export default async function ProfileQrPage({ params }: ProfileQrPageProps) {
  if (!isProfileQrEnabled()) {
    notFound();
  }

  const { token } = await params;
  const target = await resolveProfileQrTarget(token);

  if (!target) {
    notFound();
  }

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const isOwnProfile = authUser?.id === target.profile.id;

  // Self-scan: do not create scan record; redirect to own profile (where My QR lives)
  if (isOwnProfile) {
    redirect(`/profile/${target.profile.twitter_handle}`);
  }

  return (
    <>
      <Header />
      <main className="min-h-screen pt-20 pb-16 px-4 bg-[radial-gradient(circle_at_top_left,_rgba(15,171,103,0.14),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(255,255,255,0.08),_transparent_24%),var(--color-background)]">
        <div className="max-w-5xl mx-auto flex justify-center">
          <ProfileQrLanding
            token={token}
            profile={target.profile}
            isOwnProfile={false}
          />
        </div>
      </main>
      <Footer />
    </>
  );
}
