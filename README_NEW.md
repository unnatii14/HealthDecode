# 🏥 HealthDecode - Medical Report Analyzer

> A progressive web app that analyzes medical lab reports entirely in your browser. No backend required, works offline, 100% free to host!

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/unnatii14/HealthDecode)

## ✨ Features

- 📄 **PDF & Image Support** - Upload any medical lab report
- 🔍 **Smart Analysis** - Recognizes 30+ biomarkers automatically
- 💡 **Health Insights** - Get explanations and recommendations
- 📚 **Knowledge Base** - Learn about essential vitamins and minerals
- 🚀 **100% Client-Side** - No backend, no API delays, works offline
- 🎨 **Beautiful UI** - Modern, responsive design with TailwindCSS

## 🚀 Quick Start

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Open http://localhost:5173
```

### Production Build

```bash
# Build for production
npm run build

# Preview production build
npm run preview
```

## 🌐 Deploy (Free Forever)

### Option 1: Vercel (Recommended - 1 Click)

1. Click the "Deploy with Vercel" button above
2. Connect your GitHub account
3. Done! Get your live demo link

### Option 2: Netlify

1. Push to GitHub
2. Go to [netlify.com](https://netlify.com)
3. Import project, deploy

### Option 3: GitHub Pages

```bash
npm run build
npx gh-pages -d dist
```

**See [VERCEL_DEPLOY.md](VERCEL_DEPLOY.md) for detailed instructions**

## 🛠️ Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **UI**: TailwindCSS, Radix UI
- **PDF Processing**: PDF.js
- **OCR**: Tesseract.js
- **Deployment**: Vercel / Netlify / GitHub Pages

## 🎯 How It Works

1. **Upload** - Drop your PDF or image lab report
2. **Extract** - PDF.js extracts text, Tesseract.js handles images
3. **Analyze** - Smart pattern matching identifies biomarkers
4. **Display** - Beautiful cards show results with explanations

## 📱 Biomarkers Detected

### Diabetes
- Glucose, HbA1c

### Lipid Profile  
- Total Cholesterol, LDL, HDL, Triglycerides

### Liver Function
- ALT (SGPT), AST (SGOT), Alkaline Phosphatase

### Kidney Function
- Creatinine, BUN, Uric Acid

### Blood Count
- Hemoglobin, WBC, Platelets

### Thyroid
- TSH, T3, T4

### Vitamins & Minerals
- Vitamin D, B12, Iron, Calcium

### Electrolytes
- Sodium, Potassium

## 🔒 Privacy

All processing happens in your browser. No data is sent to any server. Your medical reports are never uploaded or stored.

## 📸 Screenshots

*Upload any medical report*
![Upload Screen]

*Get instant analysis*
![Results Screen]

*Learn about nutrients*
![Knowledge Base]

## 🤝 Contributing

Pull requests are welcome! For major changes, please open an issue first.

## 📄 License

MIT

## 👤 Author

**Unnati**
- GitHub: [@unnatii14](https://github.com/unnatii14)
- Portfolio: [Add your portfolio link]

## 🙏 Acknowledgments

- PDF.js by Mozilla
- Tesseract.js
- Radix UI components
- TailwindCSS

---

Made with ❤️ for better health awareness
