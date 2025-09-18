import React from 'react';
import { Link } from 'react-router-dom';

const About: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-100">
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-4xl font-bold text-gray-900 mb-8">About PulseBridge</h1>
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Our Mission</h2>
          <p className="text-gray-600 mb-4">
            PulseBridge is a modern web application built with React, TypeScript, and Tailwind CSS.
            We aim to provide a solid foundation for building scalable and maintainable web applications.
          </p>
        </div>
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Technology Stack</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xl font-medium text-gray-700 mb-2">Frontend</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>React 18</li>
                <li>TypeScript</li>
                <li>Tailwind CSS</li>
                <li>React Router</li>
              </ul>
            </div>
            <div>
              <h3 className="text-xl font-medium text-gray-700 mb-2">Development</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Create React App</li>
                <li>ESLint</li>
                <li>PostCSS</li>
                <li>Modern JavaScript</li>
              </ul>
            </div>
          </div>
        </div>
        <div className="mt-8">
          <Link 
            to="/" 
            className="inline-block bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default About; 