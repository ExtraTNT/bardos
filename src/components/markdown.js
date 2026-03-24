import { vnode } from '../../lib/odocosJS/src/render.js';
import { pipe, Just, Nothing, toMaybe } from '../../lib/odocosJS/src/core.js';
import { eq, gt } from '../../lib/odocosJS/src/math.js';
import { highlight, defaultRegistry } from './highlight.js';

// ----------------------------------------------------------------------------
// Vnode constructors
// ----------------------------------------------------------------------------
const el = tag => vnode(tag)({});
const map = f => xs => xs.map(f);

const [div, p, ul, ol, li, pre, code, em, strong, blockquote] = map(el)
    (['div', 'p', 'ul', 'ol', 'li', 'pre', 'code', 'em', 'strong', 'blockquote']);
const a = vnode('a');
const img = vnode('img');
const h = level => el(`h${level}`);
const hr = () => vnode('hr')({})([]);

// ----------------------------------------------------------------------------
// Combinators
// ----------------------------------------------------------------------------
const test = re => s => re.test(s);
const match = re => s => toMaybe(s.match(re));
const trim = s => s.trim();
const join = sep => xs => xs.join(sep);
const startsWith = pfx => s => s.startsWith(pfx);
const not = f => (...args) => !f(...args);
const isBlank = pipe(trim, eq(''));

// Normalize fenced language ids (case + common aliases/symbol forms).
const normalizeLang = raw => {
    const k = (raw || '').trim().toLowerCase();
    return ({
        'c#': 'csharp',
        cs: 'csharp',
        python3: 'python',
        py3: 'python',
    })[k] || k;
};

// Church-encoded Maybe bind: Nothing -> Nothing, Just(a) -> f(a)
const bind = ma => f => ma(_ => Nothing)(f);

// Lift a boolean + value into Maybe
const guard = cond => val => cond ? Just(val) : Nothing;

// Try rules in order, return first Just
const tryRules = ([rule, ...rest]) => input =>
    rule === undefined
        ? Nothing
        : rule(input)
            (_ => tryRules(rest)(input))
            (Just);

// Split array by predicate -> [matching prefix, rest]
const span = pred => xs => {
    const i = xs.findIndex(not(pred));
    return eq(i)(-1) ? [xs, []] : [xs.slice(0, i), xs.slice(i)];
};

// Prepend char to first string token (coalesces adjacent text)
const consText = ch => tokens =>
    gt(tokens.length)(0) && typeof tokens[0] === 'string'
        ? [ch + tokens[0], ...tokens.slice(1)]
        : [ch, ...tokens];

// Lift an indexOf result into Maybe
const liftIndex = i => eq(i)(-1) ? Nothing : Just(i);

// ----------------------------------------------------------------------------
// Inline parser - rule-based recursive descent over string
// ----------------------------------------------------------------------------
// Each rule: String -> Maybe { nodes: [VNode|String], rest: String }

const findClose = marker => from => text =>
    liftIndex(text.indexOf(marker, from));

const inlineImage = text =>
    bind(guard(text.startsWith('!['))(text))    (t =>
    bind(findClose(']')(2)(t))                  (le =>
    bind(guard(eq(t[le + 1])('('))(le + 2))     (hs =>
    bind(findClose(')')(hs)(t))                 (he =>
        Just({
            nodes: [img({ src: t.slice(hs, he), alt: t.slice(2, le) })([])],
            rest: t.slice(he + 1),
        })
    ))));

const inlineLink = (text) =>
    bind(guard(eq(text[0])("["))(1))            (s =>
    bind(findClose("]")(s)(text))               (le =>
    bind(guard(eq(text[le + 1])("("))(le + 2))  (hs =>
    bind(findClose(")")(hs)(text))              (he =>
        Just({
            nodes: [
                a({ href: text.slice(hs, he) })(parseInline(text.slice(1, le))),
            ],
            rest: text.slice(he + 1),
          })
    ))))

const inlineCode = (text) =>
    bind(guard(eq(text[0])("`"))(1))((s) =>
    bind(findClose("`")(s)(text))((end) =>
        Just({
            nodes: [code([text.slice(s, end)])],
            rest: text.slice(end + 1),
      })
    ))

const inlineBold = text =>
    bind(guard(text.startsWith('**') || text.startsWith('__'))
        (text.slice(0, 2)))             (marker =>
    bind(findClose(marker)(2)(text))    (end =>
        Just({
            nodes: [strong(parseInline(text.slice(2, end)))],
            rest: text.slice(end + 2),
        })
    ));

const inlineItalic = text =>
    bind(guard(
            (text[0] === '*' || text[0] === '_')
            && text[1] !== text[0]
        )
        (text[0]))                      (marker =>
    bind(findClose(marker)(1)(text))    (end =>
        Just({
            nodes: [em(parseInline(text.slice(1, end)))],
            rest: text.slice(end + 1),
        })
    ));

const inlineRules =
    [inlineImage, inlineLink, inlineCode, inlineBold, inlineItalic];

/**
 * Parse inline markdown elements from the start of the string, returning an
 * array of nodes and the remaining unparsed string. If no rules match, returns
 * the first character as a text node and continues parsing.
 * @param {string} text - The input string to parse.
 * @returns {Array} An array of VNodes and strings representing the parsed
 * inline elements.
 * 
 * @haskell parseInline :: String -> [VNode | String]
 */
const parseInline = text =>
    eq(text.length)(0)
        ? []
        : tryRules(inlineRules)(text)
            (_ => consText(text[0])(parseInline(text.slice(1))))
            (({ nodes, rest }) => [...nodes, ...parseInline(rest)]);

// ----------------------------------------------------------------------------
// Block parser — rule-based recursive descent over lines
// ----------------------------------------------------------------------------
// Each rule: [String] -> Maybe { blocks: [VNode], rest: [String] }

const blockBlank = lines =>
    guard(isBlank(lines[0]))({ blocks: [], rest: lines.slice(1) });

const blockFenced = lines =>
    bind(match(/^`{3,}\s*([^\s`]*)/)(lines[0].trimStart()))(m => {
        const lang   = normalizeLang(m[1] || '');
        const rest   = lines.slice(1);
        const [body, after] = span(not(pipe(trim, startsWith('```'))))(rest);
        const source = join('\n')(body);
        const tokens = highlight(hlRegistry)(lang)(source);
        return Just({
            blocks: [pre([
                vnode('code')({ className: lang ? 'lang-' + lang : '' })
                (tokens)
            ])],
            rest: gt(after.length)(0) ? after.slice(1) : [],
        });
    });

const blockHeading = lines =>
    bind(match(/^(#{1,6})\s+(.*)/)(lines[0]))(m =>
        Just({
            blocks: [h(m[1].length)(parseInline(m[2]))],
            rest: lines.slice(1),
        })
    );

const blockHR = lines =>
    bind(match(/^(-{3,}|\*{3,}|_{3,})\s*$/)(lines[0].trim()))(_ =>
        Just({ blocks: [hr()], rest: lines.slice(1) })
    );

const blockQuote = lines =>
    bind(guard(startsWith('> ')(lines[0].trimStart()))(lines))(ls => {
        const [quoted, rest] = span(pipe(trim, startsWith('> ')))(ls);
        const inner = map(pipe(trim, s => s.slice(2)))(quoted);
        return Just({
            blocks: [blockquote(parseMarkdown(join('\n')(inner)))],
            rest,
        });
    });

const blockUL = lines =>
    bind(guard(test(/^\s*[-*]\s+/)(lines[0]))(lines))(_ => {
        const [items, rest] = span(test(/^\s*[-*]\s+/))(lines);
        return Just({
            blocks: [
                ul(map(l => li(parseInline(l.replace(/^\s*[-*]\s+/, ''))))
                (items))
            ],
            rest,
        });
    });

const blockOL = lines =>
    bind(guard(test(/^\s*\d+\.\s+/)(lines[0]))(lines))(_ => {
        const [items, rest] = span(test(/^\s*\d+\.\s+/))(lines);
        return Just({
            blocks: [
                ol(map(l => li(parseInline(l.replace(/^\s*\d+\.\s+/, ''))))
                (items))
            ],
            rest,
        });
    });

const blockSpoiler = lines =>
    bind(match(/^\((.+?)\)\[(.*)$/)(lines[0]))(m => {
        const label   = m[1];
        const firstBit = m[2];

        // Single-line: (label)[content]
        if (firstBit.endsWith(']'))
            return Just({
                blocks: [spoiler(label)(firstBit.slice(0, -1))],
                rest:   lines.slice(1),
            });
        
        const [body, after] = span(not(pipe(trim, eq(']'))))(lines.slice(1));
        return Just({
            blocks: [
                spoiler(label)(join('\n')(
                    [...(firstBit.length > 0 ? [firstBit] : []), ...body]
                ))
            ],
            rest:   gt(after.length)(0) ? after.slice(1) : [],
        });
    });

const spoiler = label => content =>
    vnode('details')({ className: 'spoiler' })([
        vnode('summary')({})([
            vnode('span')({ className: 'spoiler-arrow' })([]),
            ...parseInline(label)
        ]),
        div(parseMarkdown(content)),
    ]);

const isSpecial = line =>
    isBlank(line) ||
    startsWith('```')(line.trimStart()) ||
    test(/^#{1,6}\s/)(line) ||
    test(/^(-{3,}|\*{3,}|_{3,})\s*$/)(line.trim()) ||
    startsWith('> ')(line.trimStart()) ||
    test(/^\s*[-*]\s+/)(line) ||
    test(/^\s*\d+\.\s+/)(line) ||
    test(/^\(.+?\)\[/)(line);

const blockParagraph = lines => {
    const [body, rest] = span(not(isSpecial))(lines);
    return guard(gt(body.length)(0))({
        blocks: [p(parseInline(join(' ')(body)))],
        rest,
    });
};

const blockRules = [
    blockBlank, blockFenced, blockHeading, blockHR,
    blockQuote, blockUL, blockOL, blockSpoiler, blockParagraph,
];

/**
 * Function to parse a markdown string into an array of VNodes representing the
 * block-level structure of the markdown content. It processes the input string
 * line by line, applying a series of rules to identify different markdown
 * constructs such as headings, lists, blockquotes, and code blocks. The
 * resulting VNodes can then be rendered into HTML or used in a virtual DOM.
 * @param {string} md 
 * @returns {Array} An array of VNodes representing the parsed markdown blocks.
 * 
 * @haskell parseMarkdown :: String -> [VNode]
 */
const parseMarkdown = md => {
    const go = lines =>
        eq(lines.length)(0)
            ? []
            : tryRules(blockRules)(lines)
                (_ => go(lines.slice(1)))
                (({ blocks, rest }) => [...blocks, ...go(rest)]);

    return pipe(s => s.split('\n'), go)(md);
};

/**
 * Turns a markdown string into a VNode by parsing the markdown into block-level
 * and inline elements and constructing a corresponding virtual DOM structure.
 * The resulting VNodes are placed in a div container.
 * 
 * @param {string} md input markdown string
 * @returns {VNode} div with parsed markdown content as children
 * 
 * @haskell markdownToVnode :: String -> VNode
 */
let hlRegistry = defaultRegistry;
const setHighlightRegistry = r => { hlRegistry = r; };

const markdownToVnode = md => div(parseMarkdown(md));

export { parseInline, parseMarkdown, markdownToVnode, setHighlightRegistry };
