# NOTE: In order to get references right, occasionally you have to run this more
# than once. pdflatex will tell you. Make generally refuses to run LaTeX the
# second time, so I added a pass2 target.

LATEX = pdflatex
DOT = dot -Tpng  

all: refactor.pdf

refactor.pdf: mode_diagram.png refactor.tex
	$(LATEX) refactor.tex

mode_diagram.png: mode_diagram.dot
	$(DOT) -omode_diagram.png mode_diagram.dot

clean:
	rm *.png *.log *.pdf *.aux

pass2: 
	$(LATEX) refactor.tex
	
