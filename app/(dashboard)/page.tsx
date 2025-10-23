import Footer from '@/components/Footer';
import AdminCard from '@/components/AdminCard';
import UserCard from '@/components/UserCard';
import YouTubeEmbed from '@/components/YouTubeEmbed';

export default function HomePage() {
  return (
    <main>
      {/* Hero */}
      <section className="py-20 bg-gray-50 dark:bg-[rgba(10,15,25,0.92)] dark:backdrop-blur-md dark:border-y dark:border-white/10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-bold text-gray-900 tracking-tight sm:text-5xl md:text-6xl dark:text-slate-100">
            Gold Money
            <span className="block text-orange-500 dark:text-[#6ad0ff]">Anybody Earn MONEY</span>
          </h1>

          <p className="mt-5 text-lg text-gray-600 max-w-2xl mx-auto dark:text-slate-300">
            Anybody without special knowledge can earn money through BetFriend.<br />
            Try it now!
            Result will amaze you.
          </p>

          <div className="mt-10">
            {/* 유튜브 카드에 다크 전용 유리감 */}
            <div className="rounded-xl p-2 bg-white dark:bg-slate-900/40 border border-transparent dark:border-white/10 dark:shadow-[0_4px_20px_rgba(0,0,0,0.45)]">
              <YouTubeEmbed videoId="dQw4w9WgXcQ" />
            </div>
          </div>
        </div>
      </section>

      {/* Admin Dashboard Cards */}
      <section className="py-5 bg-gray-50 dark:bg-[rgba(10,15,25,0.90)] dark:backdrop-blur-md dark:border-y dark:border-white/10">
        <div className="container px-5 py-4 mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100">Admin Dashboard Features</h2>
            <p className="text-gray-500 mt-2 dark:text-slate-400">
              Manage your users, roles, and settings efficiently with our dashboard tools.
            </p>
          </div>

          <div className="flex flex-wrap -m-4">
            <AdminCard imgHref="/images/admin_dashboard/pexels-alex-dos-santos-305643819-34065606.jpg" title="User Management" description="Easily manage user accounts, roles, and permissions with our intuitive admin dashboard." />
            <AdminCard imgHref="/images/admin_dashboard/pexels-pixabay-47730.jpg" title="Billing & Subscriptions" description="Handle billing, subscriptions, and payments seamlessly with integrated Stripe support." />
            <AdminCard imgHref="/images/admin_dashboard/pexels-mike-468229-1171084.jpg" title="Analytics & Reporting" description="Gain insights into user behavior and application performance with built-in analytics tools." />
          </div>
        </div>
      </section>

      {/* User Dashboard Cards */}
      <section className="py-5 bg-gray-50 dark:bg-[rgba(10,15,25,0.90)] dark:backdrop-blur-md dark:border-y dark:border-white/10">
        <div className="container px-5 py-4 mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-slate-100">User Experiences</h2>
            <p className="text-gray-500 mt-2 dark:text-slate-400">
              Ive earned much after using this BetFriend.
            </p>
          </div>

          <div className="flex flex-wrap -m-4">
            <UserCard
              userImage="/images/user_dashboard/Aurora.jpg"
              userName="Aurora"
              imgHref="/images/user_dashboard/extra-img-1b5fd7c0e9e959baba282beeb7f4ba3d0881ed534b9dba5618d832d53ea79797.jpg"
              title="User Management"
              description="Easily manage user accounts, roles, and permissions with our intuitive admin dashboard."
            />
            <UserCard
              userImage="/images/user_dashboard/Jack.png"
              userName="Jack"
              imgHref="/images/user_dashboard/extra-img2-750a21cf676df190f4d5c4705927f7d3555bc99400ef1e9deb99cc9d3acd369b.png"
              title="Billing & Subscriptions"
              description="Handle billing, subscriptions, and payments seamlessly with integrated Stripe support."
            />
            <UserCard
              userImage="/images/user_dashboard/Panda.png"
              userName="Panda"
              imgHref="/images/admin_dashboard/pexels-pixabay-262524.jpg"
              title="Analytics & Reporting"
              description="Gain insights into user behavior and application performance with built-in analytics tools."
            />
            <UserCard
              userImage="/images/user_dashboard/Lion.png"
              userName="Lion"
              imgHref="/images/admin_dashboard/pexels-pixabay-262524.jpg"
              title="Analytics & Reporting"
              description="Gain insights into user behavior and application performance with built-in analytics tools."
            />
          </div>
        </div>
      </section>

      <Footer />
    </main>
  );
}
