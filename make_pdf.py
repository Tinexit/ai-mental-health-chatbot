import textwrap
from fpdf import FPDF
import re

class AcademicReportPDF(FPDF):
    def header(self):
        # Draw a clean border on every page
        # Margin is 10. The page is 210 x 297 mm (A4)
        self.rect(10, 10, 190, 277)
        # Add a subtle inner border for a more formal look
        self.rect(11, 11, 188, 275)
        
    def footer(self):
        # Position at 1.5 cm from bottom
        self.set_y(-20)
        self.set_font('Times', 'I', 10)
        self.cell(0, 10, f'Page {self.page_no()}', 0, 0, 'C')

pdf = AcademicReportPDF()
pdf.add_page()
pdf.set_auto_page_break(auto=True, margin=25)
pdf.set_margins(20, 20, 20)

with open("deepsearch/project_report.md", "r", encoding="utf-8", errors="ignore") as f:
    lines = f.readlines()

for line in lines:
    line = line.strip()
    if not line:
        pdf.ln(5)
        continue
    
    # Very basic markdown parsing
    if line.startswith("# "):
        pdf.set_font("Times", "B", 18)
        pdf.cell(0, 10, txt=line[2:], ln=True, align="C")
        pdf.ln(5)
    elif line.startswith("## "):
        pdf.set_font("Times", "B", 16)
        pdf.cell(0, 10, txt=line[3:], ln=True, align="L")
        pdf.ln(3)
    elif line.startswith("### "):
        pdf.set_font("Times", "B", 14)
        pdf.cell(0, 10, txt=line[4:], ln=True, align="L")
        pdf.ln(2)
    elif line.startswith("Chapter ") or line.startswith("References"):
        pdf.set_font("Times", "B", 16)
        pdf.cell(0, 10, txt=line, ln=True, align="L")
        pdf.ln(3)
    elif re.match(r"^[0-9]+\.[0-9]+ ", line):
        pdf.set_font("Times", "B", 12)
        pdf.cell(0, 8, txt=line, ln=True, align="L")
        pdf.ln(2)
    elif line.startswith("* "):
        pdf.set_font("Times", "", 12)
        text = line[2:]
        text = text.replace("**", "")
        wrapped = textwrap.wrap(chr(149) + " " + text, width=70) # chr(149) is bullet point in standard fonts
        for w in wrapped:
            pdf.cell(0, 6, txt=w.encode('latin-1', 'replace').decode('latin-1'), ln=True)
    elif line.startswith("-"):
        continue # Ignore the line breaks
    else:
        pdf.set_font("Times", "", 12)
        line = line.replace("**", "")
        wrapped = textwrap.wrap(line, width=75)
        for w in wrapped:
            pdf.cell(0, 6, txt=w.encode('latin-1', 'replace').decode('latin-1'), ln=True, align="L")

pdf.output("deepsearch/project_report.pdf")
print("Successfully generated PDF with academic borders and formatting.")
