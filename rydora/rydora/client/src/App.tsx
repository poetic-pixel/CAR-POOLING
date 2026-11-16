import { Link, NavLink, Navigate, Route, Routes } from 'react-router-dom';
import { SignedIn, SignedOut, SignIn, SignUp, UserButton } from '@clerk/clerk-react';
import { motion } from 'framer-motion'; import Logo from './components/Logo';
import Home from './pages/Home'; import FindRide from './pages/FindRide'; import OfferRide from './pages/OfferRide'; import Dashboard from './pages/Dashboard'; import Info from './pages/Info';
const nav = [['/find', 'Find a Ride'], ['/offer', 'Offer a Ride'], ['/how-it-works', 'How It Works'], ['/safety', 'Safety'], ['/about', 'About Us']];
const Protected = ({ children }: { children: JSX.Element }) => (<><SignedIn>{children}</SignedIn><SignedOut><Navigate to="/sign-in" replace /></SignedOut></>);
export default function App() {
  return (<div className="min-h-screen">
    <header className="border-b border-white/10 bg-midnight/80 backdrop-blur sticky top-0 z-[2000]">
      <nav className="max-w-6xl mx-auto px-4 py-3 flex flex-wrap items-center gap-x-5 gap-y-2" aria-label="Main">
        <Link to="/"><Logo /></Link>
        <div className="flex flex-wrap gap-x-4 text-sm flex-1">{nav.map(([to, l]) =>
          <NavLink key={to} to={to} className={({ isActive }) => isActive ? 'text-mint border-b-2 border-mint' : 'text-muted hover:text-white'}>{l}</NavLink>)}</div>
        <SignedIn><NavLink to="/dashboard" className="text-sm text-mint">Dashboard</NavLink><UserButton /></SignedIn>
        <SignedOut><Link className="btn-ghost text-sm" to="/sign-in">Log in</Link><Link className="btn text-sm" to="/sign-up">Register</Link></SignedOut>
      </nav></header>
    <motion.main initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="max-w-6xl mx-auto px-4 py-8">
      <Routes>
        <Route path="/" element={<Home />} /><Route path="/find" element={<FindRide />} />
        <Route path="/offer" element={<Protected><OfferRide /></Protected>} /><Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/sign-in/*" element={<div className="flex justify-center"><SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" fallbackRedirectUrl="/dashboard" /></div>} />
        <Route path="/sign-up/*" element={<div className="flex justify-center"><SignUp routing="path" path="/sign-up" signInUrl="/sign-in" fallbackRedirectUrl="/dashboard" /></div>} />
        <Route path="/:page" element={<Info />} />
      </Routes></motion.main>
    <footer className="text-center text-muted text-sm py-8">RYDORA — Share the Ride. Shape the Future.</footer></div>);
}
