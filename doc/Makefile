# NOTE: In order to get references right, occasionally you have to run this more
# than once. pdflatex will tell you. Make generally refuses to run LaTeX the
# second time, so I added a pass2 target.

LATEX = pdflatex
DOT = dot -Tpdf  

all: refactor.pdf

refactor.pdf: mode_diagram.pdf refactor.tex min_process.pdf
	$(LATEX) refactor.tex

mode_diagram.pdf: mode_diagram.dot
	$(DOT) -omode_diagram.pdf mode_diagram.dot

min_process.pdf: min_process.dot
	$(DOT) -omin_process.pdf min_process.dot

clean:
	rm *.png *.log *.pdf *.aux

pass2: 
	$(LATEX) refactor.tex
	
