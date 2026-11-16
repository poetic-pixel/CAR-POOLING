import React from 'react'; import ReactDOM from 'react-dom/client'; import { BrowserRouter } from 'react-router-dom';
import { ClerkProvider } from '@clerk/clerk-react'; import App from './App'; import './index.css';
const key = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined;
ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>{key ? <ClerkProvider publishableKey={key}><BrowserRouter><App /></BrowserRouter></ClerkProvider>
    : <p className="p-8">Missing <code>VITE_CLERK_PUBLISHABLE_KEY</code> — copy client/.env.example to client/.env and add your Clerk key.</p>}</React.StrictMode>);
