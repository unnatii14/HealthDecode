import { useState, useEffect } from 'react';
import { Search, Leaf, Zap, Heart, Brain, Shield, Sun, Bone, Eye, TrendingUp, AlertCircle, Info } from 'lucide-react';
import { Card } from './ui/card';
import { Input } from './ui/input';
import { Badge } from './ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Alert, AlertDescription } from './ui/alert';
import { KNOWLEDGE_BASE, searchNutrients, Nutrient } from '../../lib/knowledgeBase';

export default function KnowledgeExplorer() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNutrient, setSelectedNutrient] = useState<Nutrient | null>(null);
  const [filteredNutrients, setFilteredNutrients] = useState<Nutrient[]>(KNOWLEDGE_BASE);

  // Icon mapping for categories
  const categoryIcons: Record<string, any> = {
    'Vitamins': Sun,
    'Minerals': Bone,
    'Fatty Acids': Heart,
    'Electrolytes': Zap,
  };

  const categoryColors: Record<string, string> = {
    'Vitamins': 'from-yellow-500 to-orange-500',
    'Minerals': 'from-gray-600 to-slate-700',
    'Fatty Acids': 'from-red-500 to-pink-500',
    'Electrolytes': 'from-blue-500 to-cyan-500',
  };

  // Filter nutrients when search query changes
  useEffect(() => {
    const results = searchNutrients(searchQuery);
    setFilteredNutrients(results);
  }, [searchQuery]);

  const getIcon = (category: string) => {
    return categoryIcons[category] || Shield;
  };

  const getColor = (category: string) => {
    return categoryColors[category] || 'from-teal-500 to-cyan-500';
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      {/* Header */}
      <div className="text-center mb-12">
        <h2 className="text-3xl md:text-4xl font-bold mb-4">
          <span className="bg-gradient-to-r from-teal-600 to-cyan-600 bg-clip-text text-transparent">
            Health Knowledge Explorer
          </span>
        </h2>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          Learn about essential vitamins and minerals, their benefits, deficiency symptoms, and food sources
        </p>
      </div>

      {/* Info Alert */}
      <Alert className="mb-8 border-blue-200 bg-blue-50">
        <Info className="h-5 w-5 text-blue-600" />
        <AlertDescription className="text-blue-800">
          This information is for educational purposes. Reference ranges may vary by laboratory and individual factors. 
          Consult healthcare professionals for personalized advice.
        </AlertDescription>
      </Alert>

      {/* Search Bar */}
      <div className="max-w-2xl mx-auto mb-12">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search for vitamins, minerals, or symptoms..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-12 py-6 text-lg border-2 border-teal-200 focus:border-teal-400 rounded-xl"
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md mx-auto mb-8">
          <TabsTrigger value="all">All Nutrients</TabsTrigger>
          <TabsTrigger value="vitamins">Vitamins</TabsTrigger>
          <TabsTrigger value="minerals">Minerals</TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <NutrientGrid 
            nutrients={filteredNutrients} 
            onSelect={setSelectedNutrient}
            getIcon={getIcon}
            getColor={getColor}
          />
        </TabsContent>

        <TabsContent value="vitamins">
          <NutrientGrid 
            nutrients={filteredNutrients.filter(n => n.category === 'Vitamins')} 
            onSelect={setSelectedNutrient}
            getIcon={getIcon}
            getColor={getColor}
          />
        </TabsContent>

        <TabsContent value="minerals">
          <NutrientGrid 
            nutrients={filteredNutrients.filter(n => n.category === 'Minerals' || n.category === 'Electrolytes')} 
            onSelect={setSelectedNutrient}
            getIcon={getIcon}
            getColor={getColor}
          />
        </TabsContent>
      </Tabs>

      {/* Detailed View Modal/Card */}
      {selectedNutrient && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setSelectedNutrient(null)}>
          <Card className="max-w-4xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className={`bg-gradient-to-r ${getColor(selectedNutrient.category)} p-8 text-white`}>
              <div className="flex items-center gap-4 mb-4">
                {(() => {
                  const Icon = getIcon(selectedNutrient.category);
                  return <Icon className="w-12 h-12" />;
                })()}
                <div>
                  <h3 className="text-3xl font-bold">{selectedNutrient.name}</h3>
                  <Badge className="mt-2 bg-white/20 text-white border-white/30">
                    {selectedNutrient.category.toUpperCase()}
                  </Badge>
                </div>
              </div>
              <p className="text-lg text-white/90">{selectedNutrient.description}</p>
            </div>

            <div className="p-8 space-y-6">
              {/* Key Info Card */}
              <Card className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 border-teal-200">
                <h4 className="font-semibold text-teal-800 mb-2">Daily Requirement</h4>
                <p className="text-2xl font-bold text-teal-900">{selectedNutrient.daily_requirement}</p>
              </Card>

              {/* Benefits */}
              <div>
                <h4 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
                  <TrendingUp className="w-5 h-5 text-green-600" />
                  Health Benefits
                </h4>
                <div className="grid md:grid-cols-2 gap-3">
                  {selectedNutrient.benefits.map((benefit, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-green-50 p-3 rounded-lg border border-green-200">
                      <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                      <p className="text-gray-700">{benefit}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Deficiency Symptoms */}
              <div>
                <h4 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
                  <AlertCircle className="w-5 h-5 text-orange-600" />
                  Deficiency Symptoms
                </h4>
                <div className="grid md:grid-cols-2 gap-3">
                  {selectedNutrient.deficiency_symptoms.map((symptom, idx) => (
                    <div key={idx} className="flex items-start gap-3 bg-orange-50 p-3 rounded-lg border border-orange-200">
                      <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                      <p className="text-gray-700">{symptom}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Food Sources */}
              <div>
                <h4 className="text-xl font-bold mb-4 flex items-center gap-2 text-gray-800">
                  <Leaf className="w-5 h-5 text-teal-600" />
                  Food Sources
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {selectedNutrient.sources.map((source, idx) => (
                    <div key={idx} className="bg-gradient-to-br from-teal-50 to-cyan-50 p-4 rounded-lg text-center border border-teal-200">
                      <p className="text-gray-700 font-medium">{source}</p>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setSelectedNutrient(null)}
                className="w-full mt-4 py-3 bg-gradient-to-r from-teal-500 to-cyan-500 text-white rounded-lg font-semibold hover:from-teal-600 hover:to-cyan-600 transition-all"
              >
                Close
              </button>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}

interface NutrientGridProps {
  nutrients: Nutrient[];
  onSelect: (nutrient: Nutrient) => void;
  getIcon: (category: string) => any;
  getColor: (category: string) => string;
}

function NutrientGrid({ nutrients, onSelect, getIcon, getColor }: NutrientGridProps) {
  if (nutrients.length === 0) {
    return (
      <div className="text-center py-12">
        <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">No nutrients found. Try a different search term.</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {nutrients.map((nutrient) => {
        const Icon = getIcon(nutrient.category);
        const color = getColor(nutrient.category);
        return (
          <Card
            key={nutrient.id}
            className="p-6 hover:shadow-xl transition-all duration-300 cursor-pointer border-teal-100 bg-white group"
            onClick={() => onSelect(nutrient)}
          >
            <div className={`w-14 h-14 bg-gradient-to-br ${color} rounded-2xl flex items-center justify-center mb-4 shadow-lg group-hover:scale-110 transition-transform`}>
              <Icon className="w-7 h-7 text-white" />
            </div>
            
            <div className="mb-3">
              <h4 className="text-xl font-bold text-gray-800 mb-1">{nutrient.name}</h4>
              <Badge className={nutrient.category === 'Vitamins' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}>
                {nutrient.category}
              </Badge>
            </div>
            
            <p className="text-gray-600 text-sm mb-4 line-clamp-3">{nutrient.description}</p>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Daily Need:</span>
                <span className="font-semibold text-gray-700">{nutrient.daily_requirement}</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-teal-100">
              <p className="text-purple-600 font-medium text-sm group-hover:text-purple-700">
                Click to learn more →
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
