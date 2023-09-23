SBSS_LANGUAGE          := languages/sbss-configuration.json
SBML_LANGUAGE          := languages/sbml-configuration.json
BON_LANGUAGE           := languages/bon-configuration.json
SBSS_LANGUAGE_TEMPLATE := templates/sbss-configuration.template.json
SBML_LANGUAGE_TEMPLATE := templates/sbml-configuration.template.json
BON_LANGUAGE_TEMPLATE  := templates/bon-configuration.template.json

SBSS_SYNTAX          := syntaxes/sbss.tmLanguage.json
SBML_SYNTAX          := syntaxes/sbml.tmLanguage.json
BON_SYNTAX           := syntaxes/bon.tmLanguage.json
SBSS_SYNTAX_TEMPLATE := templates/sbss.tmLanguage.template.json
SBML_SYNTAX_TEMPLATE := templates/sbml.tmLanguage.template.json
BON_SYNTAX_TEMPLATE  := templates/bon.tmLanguage.template.json

LANGUAGE_GENERATOR := ./scripts/generate-language.py
SYNTAX_GENERATOR   := ./scripts/generate-syntax.py


.PHONY: default language syntax package clean

default: $(SBSS_SYNTAX) $(SBML_SYNTAX) $(BON_SYNTAX) $(SBSS_LANGUAGE) $(SBML_LANGUAGE) $(BON_LANGUAGE)

package: $(SBSS_SYNTAX) $(SBML_SYNTAX) $(BON_SYNTAX) $(SBSS_LANGUAGE) $(SBML_LANGUAGE) $(BON_LANGUAGE)
	vsce package

$(SBSS_LANGUAGE): $(LANGUAGE_GENERATOR) $(SBSS_LANGUAGE_TEMPLATE)
	$(LANGUAGE_GENERATOR) sbss

$(SBML_LANGUAGE): $(LANGUAGE_GENERATOR) $(SBML_LANGUAGE_TEMPLATE)
	$(LANGUAGE_GENERATOR) sbml

$(BON_LANGUAGE): $(LANGUAGE_GENERATOR) $(BON_LANGUAGE_TEMPLATE)
	$(LANGUAGE_GENERATOR) bon

$(SBSS_SYNTAX): $(SYNTAX_GENERATOR) $(SBSS_SYNTAX_TEMPLATE)
	$(SYNTAX_GENERATOR) sbss

$(SBML_SYNTAX): $(SYNTAX_GENERATOR) $(SBML_SYNTAX_TEMPLATE)
	$(SYNTAX_GENERATOR) sbml

$(BON_SYNTAX): $(SYNTAX_GENERATOR) $(BON_SYNTAX_TEMPLATE)
	$(SYNTAX_GENERATOR) bon

clean:
	$(RM) $(SBSS_SYNTAX) $(SBML_SYNTAX) $(BON_SYNTAX) $(SBSS_LANGUAGE) $(SBML_LANGUAGE) $(BON_LANGUAGE)
