#!/usr/bin/env python3

import os
import re
import subprocess
import sys

# key -> value-regex
_KNOWN_ATTRIBUTES = {
    'begin-new-page': 'yes|no',
    'pack': 'yes|no',
    
    'clear': 'none|left|right|both',
    'writing-mode': 'horizontal\\\\-tb|vertical\\\\-rl',
    'display': 'none|block|list|list\\\\-item|table',
    'shut-in-adaptives': 'yes|no',
    'page-side': 'auto|verso|recto',
    'font-weight': 'normal|bold',
    'font-style': 'normal|italic',
    'font-no-scale': 'yes|no',
    'bullet-text-align': 'left|right|center',
    'bullet-font-weight': 'normal|bold',
    'bullet-font-style': 'normal|italic',
    'bullet-font-no-scale': 'yes|no',
    
    'vertical-align': 'baseline|top|middle|bottom',
    'line-break-mode': 'auto|word\\\\-wrap|character-wrap',
    
    'text-align': 'justify|center|right|left',
    'text-justify': 'auto|distribute\\\\-all\\\\-lines',
    'text-orientation': 'mixed|upright|sideways|sideways\\\\-right',
    'text-combine-horizontal': 'none|all|digits [1-4]',
    
    'position': 'static|absolute|abs',
    'adaptive': 'yes|no',
    'flow': 'yes|no',
    'flow-mode': 'content\\\\-wrap|object\\\\-wrap',
    'align': 'top|bottom|left|right|center',
    'avoid-bottom': 'yes|no',
    
    'border-collapse': 'none|collapse',
    
    'background-image-type': 'stretch|pattern',
    
    'page-header-hidden': 'yes|no',
    'page-footer-hidden': 'yes|no',
    'page-background-image-type': 'stretch|pattern',
    
    # 'text-decoration': [...],
    
    'gravity': 'center|left|top|right|bottom|' +
               'left\\\\-top|top\\\\-left|left\\\\-bottom|bottom\\\\-left|' +
               'right\\\\-top|top\\\\-right|right\\\\-bottom|bottom\\\\-right',
}


_KNOWN_PAIR_PATTERN_TEMPLATE = '''
{
    "match": "(__KEY__)\\\\s*__SEP__\\\\s*(((\\\"|')?(__VALUE_REGEX__)(\\\"|')?)|((\\\\$[A-Z_]+))|([^__TERM__]*))",
    "captures": {
        "1": { "name": "__STYLE_PROP_NAME__" },
        "3": { "name": "__STYLE_PROP_VALUE__" },
        "7": { "name": "__STYLE_PROP_VALUE__" },
        "7": { "name": "__STYLE_VARIABLE__" },
        "9": { "name": "__STYLE_PROP_WRONG_VALUE__" }
    }
}'''

_GENERAL_PAIR_PATTERN_TEMPLATE = '''
{
    "match": "([a-z-@]+)\\\\s*__SEP__\\\\s*((\\"[^\\"]*\\")|((\\\\$[A-Z_]+))|([^__TERM__]*))",
    "captures": {
        "1": { "name": "__STYLE_PROP_NAME__" },
        "3": { "name": "__STYLE_PROP_VALUE__" },
        "4": { "name": "__STYLE_PROP_VALUE__" },
        "5": { "name": "__STYLE_VARIABLE__" },
        "6": { "name": "__STYLE_PROP_VALUE__" }
    }
}'''


_STYLE_MAP = {
    # sbss-specific styles
    '__STYLE_SBSS_IMPORT__': 'keyword.other.sbss',
    '__STYLE_SBSS_IF_ELIF__': 'keyword.control.sbss',
    '__STYLE_SBSS_ELSE_END__': 'keyword.control.sbss',
    '__STYLE_SBSS_COMMENT__': 'comment.line.double-dash.sbss',
    '__STYLE_SBSS_SELECTOR__': 'entity.name.tag.sbss',

    # sbml-specific styles
    '__STYLE_SBML_IMPORT__': 'keyword.other.sbml', # =import
    '__STYLE_SBML_BEGIN__': 'keyword.other.sbml', # =begin
    '__STYLE_SBML_END__': 'keyword.other.sbml', # =end
    '__STYLE_SBML_SECTION_NAME__': 'string.quoted.double.sbml',
    '__STYLE_SBML_IF_ELIF__': 'keyword.other.sbml', # =if =elif
    '__STYLE_SBML_ELSE__': 'keyword.other.sbml', # =else
    '__STYLE_SBML_BLOCK_OBJECT__': 'keyword.other.sbml', # =object
    '__STYLE_SBML_INLINE_OBJECT__': 'keyword.other.sbml', # =( : )=
    '__STYLE_SBML_OBJECT_TYPE__': 'string.quoted.double.sbml',
    '__STYLE_SBML_INLINE_STYLE_MARK__': 'keyword.other.sbml', # =[ | ]=
    '__STYLE_SBML_INLINE_STYLE_NAME__': 'keyword.other.sbml',
    '__STYLE_SBML_ANCHOR_MARK__': 'keyword.other.sbml', # =(anchor|)=
    '__STYLE_SBML_ANCHOR_NAME__': 'string.quoted.double.sbml',

    # common styles
    '__STYLE_PROP_NAME__': 'entity.other.attribute-name',
    '__STYLE_PROP_VALUE__': 'string.quoted.double',
    '__STYLE_PROP_WRONG_VALUE__': 'invalid.illegal',
    '__STYLE_VARIABLE__': 'markup.italic',
    '__STYLE_FILENAME__': 'string.quoted.double',
    '__STYLE_NUMBER__': 'constant.numeric',
    '__STYLE_OPERATOR__': 'keyword.operator.other',
}


def _read_file_content(filename):
    with open(filename, 'r') as file:
        return file.read()


def _make_known_pair_str(sep, term):
    prop_pair_patterns = []
    for key, value_regex in _KNOWN_ATTRIBUTES.items():
        s = _KNOWN_PAIR_PATTERN_TEMPLATE\
                .replace('__SEP__', sep)\
                .replace('__TERM__', term)\
                .replace('__KEY__', key.replace('-', '\\\\-'))\
                .replace('__VALUE_REGEX__', value_regex)
        prop_pair_patterns.append(s)
    s = _GENERAL_PAIR_PATTERN_TEMPLATE\
            .replace('__SEP__', sep)\
            .replace('__TERM__', term)
    prop_pair_patterns.append(s)
    return ','.join(prop_pair_patterns)


def _generate_syntax(lang):
    content = _read_file_content(lang + '.tmLanguage.template.json')
    
    content = content.replace('"__PROP_LIST_PATTERNS__"', _make_known_pair_str('=', ','))
    content = content.replace('"__PROP_GROUP_PATTERNS__"', _make_known_pair_str(':', ';'))
    
    for key, value in _STYLE_MAP.items():
        content = content.replace(key, value)
        
    with open('syntaxes/' + lang + '.tmLanguage.json', 'w') as file:
        file.write(content)  
    

if __name__ == '__main__':
    if not os.path.exists('syntaxes'):
        os.makedirs('syntaxes')
    _generate_syntax('sbss')
    _generate_syntax('sbml') 
