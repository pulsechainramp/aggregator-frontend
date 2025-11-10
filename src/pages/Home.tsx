import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-bg-page text-text">
      <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
        <h1 className="mb-8 text-4xl font-bold">Welcome to PulseBridge</h1>
        <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
          <div className="rounded-xl border border-border bg-bg-surface p-6 shadow-floating">
            <h2 className="text-2xl font-semibold">Getting Started</h2>
            <p className="mt-4 text-text-muted">
              This is your home page. Start building your application by adding more pages and components.
            </p>
            <Link 
              to="/start" 
              className="mt-6 touch-target inline-flex items-center rounded-lg border border-border bg-bg-surface px-4 py-2 text-sm font-semibold text-text transition-colors hover:border-primary hover:bg-primary-050/80 hover:text-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Learn More
            </Link>
          </div>
          <div className="rounded-xl border border-border bg-bg-surface p-6 shadow-floating">
            <h2 className="text-2xl font-semibold">Features</h2>
            <ul className="mt-4 list-disc space-y-2 pl-5 text-text-muted">
              <li>React with TypeScript</li>
              <li>Tailwind CSS for styling</li>
              <li>React Router for navigation</li>
              <li>Modern development setup</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home; 
