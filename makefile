SBSS_LANGUAGE          := languages/sbss-configuration.json
SBSS_LANGUAGE_TEMPLATE := sbss-configuration.template.json
SBML_LANGUAGE          := languages/sbml-configuration.json
SBML_LANGUAGE_TEMPLATE := sbml-configuration.template.json

SBSS_SYNTAX          := syntaxes/sbss.tmLanguage.json
SBSS_SYNTAX_TEMPLATE := sbss.tmLanguage.template.json
SBML_SYNTAX          := syntaxes/sbml.tmLanguage.json
SBML_SYNTAX_TEMPLATE := sbml.tmLanguage.template.json

LANGUAGE_GENERATOR := ./generate-language.py

SYNTAX_GENERATOR := ./generate-syntax.py


.PHONY: language syntax package clean

language: $(SBSS_LANGUAGE) $(SBML_LANGUAGE)

syntax: $(SBSS_SYNTAX) $(SBML_SYNTAX)

package: $(SBSS_SYNTAX) $(SBML_SYNTAX)
	vsce package

$(SBSS_LANGUAGE): $(LANGUAGE_GENERATOR) $(SBSS_LANGUAGE_TEMPLATE)
	$(LANGUAGE_GENERATOR) sbss

$(SBML_LANGUAGE): $(LANGUAGE_GENERATOR) $(SBML_LANGUAGE_TEMPLATE)
	$(LANGUAGE_GENERATOR) sbml

$(SBSS_SYNTAX): $(SYNTAX_GENERATOR) $(SBSS_SYNTAX_TEMPLATE)
	$(SYNTAX_GENERATOR) sbss

$(SBML_SYNTAX): $(SYNTAX_GENERATOR) $(SBML_SYNTAX_TEMPLATE)
	$(SYNTAX_GENERATOR) sbml

clean:
	$(RM) $(SBSS_SYNTAX) $(SBML_SYNTAX) $(SBSS_LANGUAGE) $(SBML_LANGUAGE)
