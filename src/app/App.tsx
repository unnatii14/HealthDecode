import { useState } from 'react';
import { Activity, BookOpen, Upload, Home, Menu, X } from 'lucide-react';
import { Button } from './components/ui/button';
import LandingPage from './components/LandingPage';
import ReportAnalyzer from './components/ReportAnalyzer';
import KnowledgeExplorer from './components/KnowledgeExplorer';

type View = 'home' | 'analyzer' | 'explorer';

export default function App() {
  const [currentView, setCurrentView] = useState<View>('home');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navigation = [
    { id: 'home' as View, name: 'Home', icon: Home },
    { id: 'analyzer' as View, name: 'Report Analyzer', icon: Upload },
    { id: 'explorer' as View, name: 'Health Explorer', icon: BookOpen },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-cyan-50">
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md border-b border-teal-100 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center gap-2 cursor-pointer" onClick={() => setCurrentView('home')}>
              <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <Activity className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
                  HealthDecode
                </h1>
                <p className="text-xs text-gray-500">Medical Literacy Platform</p>
              </div>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center gap-2">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Button
                    key={item.id}
                    onClick={() => setCurrentView(item.id)}
                    variant={currentView === item.id ? 'default' : 'ghost'}
                    className={currentView === item.id ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white' : 'text-gray-700 hover:text-teal-600'}
                  >
                    <Icon className="w-4 h-4 mr-2" />
                    {item.name}
                  </Button>
                );
              })}
            </nav>

            {/* Mobile menu button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg hover:bg-teal-50"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Navigation */}
          {mobileMenuOpen && (
            <div className="md:hidden py-4 border-t border-teal-100">
              <nav className="flex flex-col gap-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Button
                      key={item.id}
                      onClick={() => {
                        setCurrentView(item.id);
                        setMobileMenuOpen(false);
                      }}
                      variant={currentView === item.id ? 'default' : 'ghost'}
                      className={`justify-start ${currentView === item.id ? 'bg-gradient-to-r from-teal-500 to-cyan-500 text-white' : 'text-gray-700'}`}
                    >
                      <Icon className="w-4 h-4 mr-2" />
                      {item.name}
                    </Button>
                  );
                })}
              </nav>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main>
        {currentView === 'home' && <LandingPage onNavigate={setCurrentView} />}
        {currentView === 'analyzer' && <ReportAnalyzer />}
        {currentView === 'explorer' && <KnowledgeExplorer />}
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-teal-100 mt-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center text-sm text-gray-600">
            <p className="font-semibold text-teal-600 mb-2">⚕️ Medical Disclaimer</p>
            <p className="max-w-3xl mx-auto">
              This platform is for educational purposes only and does not provide medical diagnosis or treatment advice. 
              Always consult qualified healthcare professionals for medical concerns. Information is based on verified medical sources.
            </p>
            <p className="mt-4 text-gray-500">© 2026 HealthDecode. Empowering Health Literacy.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}