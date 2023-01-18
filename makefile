SBSS_SYNTAX          := syntaxes/sbss.tmLanguage.json
SBSS_SYNTAX_TEMPLATE := sbss.tmLanguage.template.json
SBML_SYNTAX          := syntaxes/sbml.tmLanguage.json
SBML_SYNTAX_TEMPLATE := sbml.tmLanguage.template.json

SYNTAX_GENERATOR := ./generate-syntax.py

.PHONY: syntax package clean

syntax: $(SBSS_SYNTAX) $(SBML_SYNTAX)

package: $(SBSS_SYNTAX) $(SBML_SYNTAX)
	vsce package

$(SBSS_SYNTAX): $(SYNTAX_GENERATOR) $(SBSS_SYNTAX_TEMPLATE)
	$(SYNTAX_GENERATOR) sbss

$(SBML_SYNTAX): $(SYNTAX_GENERATOR) $(SBML_SYNTAX_TEMPLATE)
	$(SYNTAX_GENERATOR) sbml

clean:
	$(RM) $(SBSS_SYNTAX) $(SBML_SYNTAX)