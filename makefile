SBSS_LANGUAGE          := sbss-configuration.json
SBML_LANGUAGE          := sbml-configuration.json
SBSS_LANGUAGE_TEMPLATE := templates/sbss-configuration.template.json
SBML_LANGUAGE_TEMPLATE := templates/sbml-configuration.template.json

SBSS_SYNTAX          := syntaxes/sbss.tmLanguage.json
SBML_SYNTAX          := syntaxes/sbml.tmLanguage.json
SBSS_SYNTAX_TEMPLATE := templates/sbss.tmLanguage.template.json
SBML_SYNTAX_TEMPLATE := templates/sbml.tmLanguage.template.json

LANGUAGE_GENERATOR := ./scripts/generate-language.py
SYNTAX_GENERATOR   := ./scripts/generate-syntax.py


.PHONY: default language syntax package clean

default: $(SBSS_SYNTAX) $(SBML_SYNTAX) $(SBSS_LANGUAGE) $(SBML_LANGUAGE)

package: $(SBSS_SYNTAX) $(SBML_SYNTAX) $(SBSS_LANGUAGE) $(SBML_LANGUAGE)
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
