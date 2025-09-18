import React from 'react';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">Welcome to PulseBridge</h1>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Getting Started</h2>
            <p className="text-gray-600 mb-4">
              This is your home page. Start building your application by adding more pages and components.
            </p>
            <Link 
              to="/about" 
              className="inline-block bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
            >
              Learn More
            </Link>
          </div>
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">Features</h2>
            <ul className="list-disc list-inside text-gray-600 space-y-2">
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