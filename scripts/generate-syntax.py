#!/usr/bin/env python3

import sys, os


_PROP_PAIR_PATTERN_TEMPLATE = r'''
{
    "match": "([a-z-]+(@[a-z-]+)?)\\s*__SEP__\\s*((\"[^\\\\\"]*\")|('[^\\\\']*')|(\\$[A-Z_][A-Z0-9_]*)|([^__TERM__]*))",
    "captures": {
        "1": { "name": "__STYLE_PROP_NAME__" },
        "3": { "name": "__STYLE_PROP_VALUE__" },
        "6": { "name": "__STYLE_VARIABLE__" }
    }
}'''


_INLINE_PROP_LIST_PATTERN_TEMPLATE = r'''
{
    "match": "([a-z-]+(@[a-z-]+)?)\\s*=\\s*((\"[^\\\\\"]*\")|('[^\\\\']*')|(\\$[A-Z_][A-Z0-9_]*)|([^(,)]*))",
    "captures": {
        "1": { "name": "__STYLE_PROP_NAME__" },
        "3": { "name": "__STYLE_PROP_VALUE__" },
        "6": { "name": "__STYLE_VARIABLE__" }
    }
}'''


_EXPRESSION_PATTERNS = r'''
{
    "name": "__STYLE_VARIABLE__",
    "match": "\\$[A-Z_][A-Z0-9_]*"
},
{
    "name": "__STYLE_OPERATOR__",
    "match": "(==|\\!=|\\*|\\+|-|/|<|<=|>|>=)"
},
{
    "name": "__STYLE_LENGTH__",
    "match": "[+-]?([0-9]*[.])?[0-9]+(pw|ph|cw|ch|mt|mr|mb|ml|sbh|eb|%)?",
    "captures": {
        "4": "__STYLE_INVALID__"
    }
}
'''


_STYLE_MAP = {
    # sbss-specific styles
    '__STYLE_SBSS_IMPORT__':        'keyword.other',
    '__STYLE_SBSS_IF_ELIF__':       'keyword.control',
    '__STYLE_SBSS_ELSE_END__':      'keyword.control',
    '__STYLE_SBSS_SELECTOR__':      'entity.name.tag',

    # sbml-specific styles
    '__STYLE_COMMENT__':            'comment.line',
    '__STYLE_SBML_IMPORT__':        'keyword.other',        # =import
    '__STYLE_SBML_BEGIN__':         'keyword.other',        # =begin
    '__STYLE_SBML_END__':           'keyword.other',        # =end
    '__STYLE_SBML_SECTION_NAME__':  'entity.name.type markup.italic',
    '__STYLE_SBML_IF_ELIF__':       'keyword.other',        # =if =elif
    '__STYLE_SBML_ELSE__':          'keyword.other',        # =else
    '__STYLE_SBML_BLOCK_OBJECT__':  'keyword.control',      # =object
    '__STYLE_SBML_STYLE__':         'keyword.control',      # =style
    '__STYLE_SBML_INLINE_OBJECT__': 'keyword.other',        # =(:)=
    '__STYLE_SBML_OBJECT_TYPE__':   'entity.name.type',
    '__STYLE_SBML_STYLE_MARK__':    'keyword.other',        # =[|]=
    '__STYLE_SBML_STYLE_NAME__':    'entity.name.type',
    '__STYLE_SBML_ANCHOR_MARK__':   'keyword.other',        # =(anchor|)=
    '__STYLE_SBML_ANCHOR_NAME__':   'string',

    # common styles
    '__STYLE_PROP_NAME__':          'entity.other.attribute-name',
    '__STYLE_PROP_VALUE__':         'string',
    '__STYLE_PROP_SEP__':           'keyword.operator',
    '__STYLE_INVALID__':            'invalid.illegal',
    '__STYLE_VARIABLE__':           'string markup.italic',
    '__STYLE_FILENAME__':           'string',
    '__STYLE_LENGTH__':             'constant.numeric',
    '__STYLE_OPERATOR__':           'keyword.operator',
}


def _make_prop_pair_pattern(sep, term):
    return _PROP_PAIR_PATTERN_TEMPLATE.replace('__SEP__', sep).replace('__TERM__', term)

def _read_file(filename):
    with open(filename, 'r') as file:
        return file.read()


def _write_file(filename, content):
    with open(filename, 'w') as file:
        file.write(content)


def _apply_styles(content):
    for key, value in _STYLE_MAP.items():
        content = content.replace(key, value)
    return content


def _generate_syntax(lang):
    content = _read_file('templates/' + lang + '.tmLanguage.template.json')
    content = content.replace('"__PROP_LIST_PATTERNS__"', _make_prop_pair_pattern('=', ','))
    content = content.replace('"__PROP_GROUP_PATTERNS__"', _make_prop_pair_pattern(':', ';'))
    content = content.replace('"__INLINE_PROP_LIST_PATTERNS__"', _INLINE_PROP_LIST_PATTERN_TEMPLATE)
    content = content.replace('"__EXPRESSION_PATTERNS__"', _EXPRESSION_PATTERNS)
    content = _apply_styles(content)
    _write_file('syntaxes/' + lang + '.tmLanguage.json', content)


if __name__ == '__main__':
    if not os.path.exists('syntaxes'):
        os.makedirs('syntaxes')
    _generate_syntax(sys.argv[1])
