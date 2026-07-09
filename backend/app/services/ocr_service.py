"""
OCR Service using Tesseract
Handles text extraction from medical reports (images and PDFs)
"""

import os
import io
import re
from typing import Optional, Tuple
from PIL import Image
import pytesseract
import fitz  # PyMuPDF
from fastapi import UploadFile, HTTPException

from app.config import settings


class OCRService:
    """Service for extracting text from medical reports using OCR"""
    
    def __init__(self):
        """Initialize OCR service"""
        # Try to set Tesseract path for Windows
        self._setup_tesseract()
        
    def _setup_tesseract(self):
        """Setup Tesseract OCR executable path"""
        # Common Windows installation paths
        possible_paths = [
            r"C:\Program Files\Tesseract-OCR\tesseract.exe",
            r"C:\Program Files (x86)\Tesseract-OCR\tesseract.exe",
            r"C:\Users\Public\Tesseract-OCR\tesseract.exe",
        ]
        
        # Check if already in PATH
        try:
            pytesseract.get_tesseract_version()
            print("✅ Tesseract found in system PATH")
            return
        except:
            pass
        
        # Try to find Tesseract in common locations
        for path in possible_paths:
            if os.path.exists(path):
                pytesseract.pytesseract.tesseract_cmd = path
                print(f"✅ Tesseract found at: {path}")
                return
        
        print("⚠️  Tesseract not found. Please install Tesseract OCR:")
        print("   Download from: https://github.com/UB-Mannheim/tesseract/wiki")
        
    async def extract_text_from_upload(self, file: UploadFile) -> str:
        """
        Extract text from uploaded file (image or PDF)
        
        Args:
            file: Uploaded file from FastAPI
            
        Returns:
            Extracted text as string
        """
        # Read file content
        content = await file.read()
        
        # Determine file type and process accordingly
        file_extension = os.path.splitext(file.filename)[1].lower()
        
        if file_extension in ['.jpg', '.jpeg', '.png', '.bmp', '.tiff']:
            return await self._extract_from_image(content)
        elif file_extension == '.pdf':
            return await self._extract_from_pdf(content)
        else:
            raise HTTPException(
                status_code=400,
                detail=f"Unsupported file type: {file_extension}"
            )
    
    async def _extract_from_image(self, image_bytes: bytes) -> str:
        """Extract text from image bytes"""
        try:
            # Open image
            image = Image.open(io.BytesIO(image_bytes))
            
            # Preprocess image for better OCR
            image = self._preprocess_image(image)
            
            # Extract text
            text = pytesseract.image_to_string(
                image,
                lang=settings.OCR_LANGUAGE,
                config='--psm 6'  # Assume uniform block of text
            )
            
            # Clean extracted text
            text = self._clean_text(text)
            
            return text
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to extract text from image: {str(e)}"
            )
    
    async def _extract_from_pdf(self, pdf_bytes: bytes) -> str:
        """Extract text from PDF bytes using PyMuPDF"""
        try:
            # Open PDF from bytes
            pdf_document = fitz.open(stream=pdf_bytes, filetype="pdf")
            
            extracted_texts = []
            
            # Try text extraction first (faster, no OCR needed)
            for page_num in range(pdf_document.page_count):
                page = pdf_document[page_num]
                text = page.get_text()
                
                # If page has text, use it
                if text.strip():
                    extracted_texts.append(text)
                else:
                    # If no text, render page as image and use OCR
                    pix = page.get_pixmap(dpi=300)
                    img_bytes = pix.tobytes("png")
                    
                    # Convert to PIL Image
                    image = Image.open(io.BytesIO(img_bytes))
                    image = self._preprocess_image(image)
                    
                    # Extract text using OCR
                    text = pytesseract.image_to_string(
                        image,
                        lang=settings.OCR_LANGUAGE,
                        config='--psm 6'
                    )
                    extracted_texts.append(text)
            
            pdf_document.close()
            
            # Combine all pages
            full_text = "\n\n".join(extracted_texts)
            full_text = self._clean_text(full_text)
            
            return full_text
            
        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to extract text from PDF: {str(e)}"
            )
    
    def _preprocess_image(self, image: Image.Image) -> Image.Image:
        """
        Preprocess image for better OCR results
        - Convert to grayscale
        - Enhance contrast
        """
        # Convert to grayscale
        if image.mode != 'L':
            image = image.convert('L')
        
        # Increase contrast (simple method)
        # In production, consider using more sophisticated preprocessing
        from PIL import ImageEnhance
        enhancer = ImageEnhance.Contrast(image)
        image = enhancer.enhance(2.0)
        
        return image
    
    def _clean_text(self, text: str) -> str:
        """
        Clean extracted text
        - Remove excessive whitespace
        - Fix common OCR errors
        - Normalize line breaks
        """
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        
        # Normalize line breaks
        text = re.sub(r'\n\s*\n', '\n\n', text)
        
        # Remove leading/trailing whitespace
        text = text.strip()
        
        return text
    
    def validate_medical_report(self, text: str) -> Tuple[bool, str]:
        """
        Validate if extracted text looks like a medical report
        
        Returns:
            (is_valid, message)
        """
        if not text or len(text.strip()) < 50:
            return False, "Extracted text is too short. Please ensure the image is clear."
        
        # Check for common medical report keywords
        medical_keywords = [
            'test', 'result', 'patient', 'laboratory', 'specimen',
            'reference', 'range', 'value', 'unit', 'report', 'date',
            'vitamin', 'mineral', 'blood', 'serum', 'analysis'
        ]
        
        text_lower = text.lower()
        found_keywords = sum(1 for keyword in medical_keywords if keyword in text_lower)
        
        if found_keywords < 2:
            return False, "Document doesn't appear to be a medical report. Please upload a valid lab report."
        
        return True, "Document validated successfully"
