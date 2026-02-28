import { notFound } from "next/navigation";
import { Header, Footer } from "@/components/layout";
import { createClient } from "@/lib/supabase/server";
import { isProfileQrEnabled } from "@/lib/qr/feature-flags";
import { ProfileContent } from "../profile-content";
import { ProfileEditProvider } from "../profile-edit-provider";
import type { Metadata } from "next";
import { getAppUrl } from "@/lib/utils";
import { ProfileViewTracker } from "@/components/analytics/profile-view-tracker";

interface ProfilePageProps {
  params: Promise<{ username: string }>;
}

export async function generateMetadata({ params }: ProfilePageProps): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  // Убираем @ если он есть в начале
  const cleanUsername = username.startsWith("@") ? username.slice(1) : username;
  
  // Получаем профиль пользователя
  const { data: user } = await supabase
    .from("profiles")
    .select(`
      *,
      countries!fk_profiles_country_code (
        name
      )
    `)
    .eq("twitter_handle", cleanUsername)
    .maybeSingle();

  if (!user) {
    return {
      title: "Profile Not Found",
    };
  }

  const appUrl = getAppUrl();
  const profileUrl = `${appUrl}/profile/${cleanUsername}`;
  // Для профилей всегда используем логотип
  const imageUrl = `${appUrl}/logo.svg`;
  
  const location = user.city && user.countries?.name
    ? `${user.city}, ${user.countries.name}`
    : user.countries?.name || user.city || "";
  
  const description = user.bio 
    ? `${user.bio}${location ? ` | ${location}` : ""}`
    : location 
    ? `Solana community member${location ? ` from ${location}` : ""}`
    : "Solana community member on SolPoint";

  return {
    title: `${user.twitter_name} (@${user.twitter_handle}) | SolPoint`,
    description: description,
    openGraph: {
      title: `${user.twitter_name} (@${user.twitter_handle})`,
      description: description,
      type: "profile",
      url: profileUrl,
      images: [
        {
          url: imageUrl,
          width: 1200,
          height: 630,
          alt: user.twitter_name,
        },
      ],
      siteName: "SolPoint",
    },
    twitter: {
      card: "summary_large_image",
      title: `${user.twitter_name} (@${user.twitter_handle})`,
      description: description,
      images: [imageUrl],
    },
  };
}

export default async function ProfilePage({ params }: ProfilePageProps) {
  const { username } = await params;
  const supabase = await createClient();

  // Убираем @ если он есть в начале
  const cleanUsername = username.startsWith("@") ? username.slice(1) : username;

  // Получаем текущего пользователя и профиль параллельно
  const [
    { data: { user: authUser } },
    { data: user, error: profileError }
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase
      .from("profiles")
      .select(`
        *,
        countries!fk_profiles_country_code (
          name
        )
      `)
      .eq("twitter_handle", cleanUsername)
      .maybeSingle()
  ]);

  // Если пользователь не найден или ошибка
  if (profileError || !user) {
    notFound();
  }

  // Определяем, является ли это профилем текущего пользователя
  const isOwnProfile = Boolean(authUser?.id && user.id && authUser.id === user.id);

  return (
    <>
      <Header />
      <ProfileViewTracker user={user} isOwnProfile={isOwnProfile} />
      <main className="min-h-screen pt-16 pb-16 bg-[var(--color-background)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-8">
          <ProfileEditProvider>
            <ProfileContent
              user={user}
              isOwnProfile={isOwnProfile}
              profileQrEnabled={isProfileQrEnabled()}
            />
          </ProfileEditProvider>
        </div>
      </main>
      <Footer />
    </>
  );
}

