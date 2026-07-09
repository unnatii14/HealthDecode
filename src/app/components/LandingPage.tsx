import { Upload, BookOpen, Shield, Sparkles, TrendingUp, Brain } from 'lucide-react';
import { Button } from './ui/button';
import { Card } from './ui/card';

interface LandingPageProps {
  onNavigate: (view: 'home' | 'analyzer' | 'explorer') => void;
}

export default function LandingPage({ onNavigate }: LandingPageProps) {
  const features = [
    {
      icon: Upload,
      title: 'Smart Report Analysis',
      description: 'Upload your medical test reports and get clear, educational explanations of your results.',
      color: 'from-teal-400 to-cyan-500',
    },
    {
      icon: BookOpen,
      title: 'Health Knowledge Base',
      description: 'Explore comprehensive information about vitamins, minerals, and common deficiencies.',
      color: 'from-cyan-400 to-teal-500',
    },
    {
      icon: Brain,
      title: 'AI-Powered Education',
      description: 'Understand complex medical terminology with simple, explainable AI-driven insights.',
      color: 'from-teal-500 to-emerald-400',
    },
    {
      icon: Shield,
      title: 'Safe & Verified',
      description: 'All information is based on verified medical sources with rule-based interpretation.',
      color: 'from-cyan-500 to-teal-600',
    },
  ];

  const stats = [
    { value: '50+', label: 'Biomarkers Tracked' },
    { value: '30+', label: 'Vitamins & Minerals' },
    { value: '100%', label: 'Privacy Protected' },
    { value: '24/7', label: 'Access Anytime' },
  ];

  return (
    <div>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-teal-100 via-white to-cyan-100 opacity-70"></div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="text-center">
            <div className="inline-flex items-center gap-2 bg-teal-100 text-teal-700 px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-4 h-4" />
              <span className="text-sm font-medium">Empowering Health Literacy</span>
            </div>
            
            <h2 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-teal-600 via-cyan-600 to-teal-500 bg-clip-text text-transparent">
              Understand Your Health,<br />One Report at a Time
            </h2>
            
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto mb-10">
              Decode medical test reports and learn about vitamin deficiencies through AI-powered education. 
              No diagnosis, just clear understanding.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button 
                size="lg"
                onClick={() => onNavigate('analyzer')}
                className="bg-gradient-to-r from-teal-500 to-cyan-500 hover:from-teal-600 hover:to-cyan-600 text-white text-lg px-8 py-6"
              >
                <Upload className="w-5 h-5 mr-2" />
                Analyze Report
              </Button>
              <Button 
                size="lg"
                variant="outline"
                onClick={() => onNavigate('explorer')}
                className="border-2 border-teal-300 text-teal-700 hover:bg-teal-50 text-lg px-8 py-6"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                Explore Health Topics
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-20">
            {stats.map((stat, index) => (
              <div key={index} className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 text-center shadow-lg border border-teal-100">
                <div className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-sm text-gray-600">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="text-center mb-16">
          <h3 className="text-3xl md:text-4xl font-bold mb-4">
            Why Choose <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">HealthDecode?</span>
          </h3>
          <p className="text-gray-600 text-lg max-w-2xl mx-auto">
            A comprehensive platform designed to help you understand medical information with confidence.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {features.map((feature, index) => {
            const Icon = feature.icon;
            return (
              <Card key={index} className="p-8 hover:shadow-xl transition-all duration-300 border-teal-100 bg-white/80 backdrop-blur-sm">
                <div className={`w-14 h-14 bg-gradient-to-br ${feature.color} rounded-2xl flex items-center justify-center mb-4 shadow-lg`}>
                  <Icon className="w-7 h-7 text-white" />
                </div>
                <h4 className="text-xl font-bold mb-3 text-gray-800">{feature.title}</h4>
                <p className="text-gray-600 leading-relaxed">{feature.description}</p>
              </Card>
            );
          })}
        </div>
      </section>

      {/* How It Works */}
      <section className="bg-gradient-to-br from-teal-50 to-cyan-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h3 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h3>
            <p className="text-gray-600 text-lg">Simple steps to better health understanding</p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: '1',
                title: 'Upload or Explore',
                description: 'Upload your medical report or browse our health knowledge base',
              },
              {
                step: '2',
                title: 'AI Analysis',
                description: 'Our educational AI breaks down complex medical terms and values',
              },
              {
                step: '3',
                title: 'Learn & Understand',
                description: 'Get clear explanations with reference ranges and educational insights',
              },
            ].map((item, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-cyan-500 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4 shadow-lg">
                  {item.step}
                </div>
                <h4 className="text-xl font-bold mb-3 text-gray-800">{item.title}</h4>
                <p className="text-gray-600">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <Card className="p-10 md:p-16 text-center bg-gradient-to-br from-teal-500 to-cyan-500 border-0 shadow-2xl">
          <TrendingUp className="w-16 h-16 text-white mx-auto mb-6" />
          <h3 className="text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Understand Your Health Better?
          </h3>
          <p className="text-teal-50 text-lg mb-8 max-w-2xl mx-auto">
            Start your journey to better health literacy today. No medical jargon, just clear explanations.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => onNavigate('analyzer')}
              className="bg-white text-teal-600 hover:bg-teal-50 text-lg px-8 py-6"
            >
              Get Started Now
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => onNavigate('explorer')}
              className="border-2 border-white bg-transparent text-white hover:bg-white hover:text-teal-600 text-lg px-8 py-6 font-semibold"
            >
              Learn More
            </Button>
          </div>
        </Card>
      </section>
    </div>
  );
}