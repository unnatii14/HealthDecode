# Installing Poppler for PDF Processing (Windows)

## What is Poppler?
Poppler is a PDF rendering library required by `pdf2image` to convert PDF pages into images for OCR processing.

## Installation Steps

### Option 1: Quick Install (Recommended)

1. **Download Poppler for Windows:**
   - Go to: https://github.com/oschwartz10612/poppler-windows/releases
   - Download the latest release (e.g., `Release-24.08.0-0.zip`)

2. **Extract the files:**
   - Extract to `C:\Program Files\poppler`
   - The folder structure should be:
     ```
     C:\Program Files\poppler\
     ├── Library\
     │   └── bin\
     │       ├── pdfinfo.exe
     │       ├── pdftoppm.exe
     │       └── ... (other executables)
     └── ... (other folders)
     ```

3. **Add to System PATH:**
   - Open System Properties → Environment Variables
   - Under "System variables", find and edit "Path"
   - Add new entry: `C:\Program Files\poppler\Library\bin`
   - Click OK to save

4. **Verify Installation:**
   ```powershell
   pdfinfo -v
   ```
   Should display version information.

5. **Restart your backend server**

### Option 2: Using Chocolatey (Package Manager)

If you have Chocolatey installed:

```powershell
choco install poppler
```

### Option 3: Specify Path in Code (If not adding to PATH)

If you don't want to modify system PATH, update the `ocr_service.py`:

```python
from pdf2image import convert_from_bytes

# Add poppler_path parameter
images = convert_from_bytes(
    pdf_bytes, 
    dpi=300,
    poppler_path=r"C:\Program Files\poppler\Library\bin"
)
```

## Testing

After installation, test with:

```powershell
cd backend
python -c "from pdf2image import convert_from_path; print('Poppler working!')"
```

## Troubleshooting

### Error: "Unable to get page count"
- Poppler is not installed or not in PATH
- Follow installation steps above

### Error: "pdfinfo not found"
- PATH was not updated correctly
- Make sure to add the `Library\bin` subfolder, not just the poppler folder
- Restart PowerShell/terminal after modifying PATH

### Still having issues?
- Ensure you extracted to the correct location
- Check that `pdfinfo.exe` exists at: `C:\Program Files\poppler\Library\bin\pdfinfo.exe`
- Try restarting your computer to ensure PATH changes take effect

## For Image-Only Reports

If you only need to process image files (JPG, PNG), Poppler is not required. The system will work with just Tesseract installed.
