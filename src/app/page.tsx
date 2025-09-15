export default function Home() {
  return (
    <div className="pt-20 bg-[var(--background)] text-[var(--foreground)] min-h-screen flex flex-col">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col items-center justify-center text-center p-20">
        <h1 className="text-4xl sm:text-6xl font-bold mb-4">Make Your Trips Happen</h1>
        <p className="text-lg sm:text-xl mb-8 max-w-xl">
          Designed to get you where you want to go. Whether you need help budgeting, or just want ideas for your next big trip, travelling the world has never been easier.
        </p>
        <button className="relative px-6 py-3 font-semibold text-white rounded-lg overflow-hidden z-10 hover:scale-105 transition">
          <span className="absolute inset-0 animate-gradient bg-[length:200%_200%] bg-gradient-to-r from-[var(--primary1)] via-[var(--primary3)] to-[var(--primary2)] rounded-lg"></span>
          <span className="relative z-10">Get Started</span>
        </button>
      </section>

      {/* Features Section */}
      <section className="bg-[var(--background)] text-[var(--foreground)] p-8 sm:p-16">
        <div className="grid sm:grid-cols-3 gap-8 text-center">
          <div>
            <h2 className="text-2xl font-semibold mb-2">🎯 Set Travel Goals</h2>
            <p>Define dream destinations and track your savings progress effortlessly.</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-2">🧳 Plan Smarter</h2>
            <p>Build detailed itineraries with deadlines, budgets, and reminders.</p>
          </div>
          <div>
            <h2 className="text-2xl font-semibold mb-2">🌍 Get Inspired</h2>
            <p>Browse stories and tips from other travelers to fuel your wanderlust.</p>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="bg-[var(--background)] text-[var(--foreground)] p-8 sm:p-16 text-center">
        <h2 className="text-3xl font-bold mb-4">Ready to make your trip happen?</h2>
        <button className="bg-[var(--foreground)] text-[var(--background)] text-black px-6 py-3 rounded-2xl font-semibold shadow-lg hover:scale-105 transition">
          Join Now – It's Free
        </button>
      </section>
    </div>
  );
}
