# colorForth
colorForth, as described by Chuck Moore, belongs to a class of Forths that use tag-delimited tokens as input. 
The colorForth name is a good description of the language. It just needs a bigger tent. 
It can be, and should be, a serious production language.

A production language should be file oriented. This is because source code needs to be viewable/editable using readily available tools. All of computing uses files as the basic persistent storage abstraction. So, you load files, not blocks.

Tokenization is the basic premise behind the source code structure. Source code should be tokenizable. A language already exists for markup. It's called HTML. You may have heard of it. HTML allows for literate programming. There are many WYSIWYG HTML editors. A token is very simple. Its text in HTML is:

```
<tag>Your Token Here</tag>
```
If your source code has tags that aren't colorForth, the loader or tokenizer will skip them. So, you can document your code in HTML. The tags are defined in a CSS. You can change the tag attributes to what pleases you visually. The encoding of the source code shall be UTF-8. This is a major entitlement, I think. Tokens are strings of Unicode with UTF-8 encoding. With that established, you can build a language. A token that leaves its address on the stack needs its own color. Orange: Immediately load the token text into a TIB and push its address and length. Orange you glad you have it?

Keep in mind that tag attributes can have any 24-bit background or foreground color, any font, bold, italic or underline. These are within the scope of the CSS. You need to know how to include the link to the CSS sheet in your HTML document. Trivial. However, the tag names must be established. Short names that don't clash with standard tags. Here are the tags historically used by GreenArrays along with my proposed tag name:

**Tag** | **Syntax Element** | **Color**
-----|:------------------|:------
fmt | Display Macro      | Blue
asm | Compiler Feedback  | Grey
var | Variable           | Magenta
com | Comment            | White
num | Interpreted Number | Yellow
mac | Compile macro call | Cyan
lit | Compile number     | Green
com | Compile forth word | Green
def | Define forth word  | Red
int | Interp forth word  | Yellow
tok | Store token text   | Orange

There are multiple versions of HERE because, while separating the code and data spaces is not essential in some cases, it is a very good idea in others. For example, in embedded systems where the cost of SRAM (in terms of die area) is ten times that of Flash. Code space may be read-only at run time. UDATA and CDATA are required, so that's two instances of HERE. The default is CDATA. If you want to keep all your data in code space, that's your business.

In the interest of scalability, to support libraries, the ANS Forth search order wordlist is adopted. 

The IDE should remember the name of the project file. It's this file that gets loaded upon reload. Everything is compiled from source instantly. In the beginning, colorForth knows nothing. It doesn't know what DUP means. You load all that in the form of macros. Granted, macros don't leverage analytical compilers. Stack computers solve that problem. A virtual stack computer is fine as an execution target.

There may be a list of predefined words with dual-token semantics. Headers are assumed to be dual-xt. When you create a word, it has default "compile call to me" and "execute me" semantics.
