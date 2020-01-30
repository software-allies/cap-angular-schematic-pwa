import {SchematicsException, Tree, UpdateRecorder} from '@angular-devkit/schematics';
import {getChildElementIndentation} from '@angular/cdk/schematics/utils/parse5-element';
import {DefaultTreeDocument, DefaultTreeElement, parse as parseHtml} from 'parse5';


/** Appends fragment the specified file. */
export function appendToStartFile(host: Tree, filePath: string, styleRule: string) {
    const fileBuffer = host.read(filePath);
    if (!fileBuffer) {
        throw new SchematicsException(`Could not read file for path: ${filePath}`);
    }
    const content = fileBuffer.toString();
    if (content.includes(styleRule)) {
        return;
    }
    const insertion = `${' '.repeat(0)}${styleRule}`;
    let recordedChange: UpdateRecorder;
    recordedChange = host
        .beginUpdate(filePath)
        .insertRight(0, `${insertion}\n`);
    host.commitUpdate(recordedChange);
}

/** Appends the given element HTML fragment to the `<body>` element of the specified HTML file. */
export function appendHtmlElementToBody(host: Tree, htmlFilePath: string, elementHtml: string, side: string = 'right') {
  const htmlFileBuffer = host.read(htmlFilePath);

  if (!htmlFileBuffer) {
    throw new SchematicsException(`Could not read file for path: ${htmlFilePath}`);
  }

  const htmlContent = htmlFileBuffer.toString();

  if (htmlContent.includes(elementHtml)) {
    return;
  }

  const bodyTag = getHtmlBodyTagElement(htmlContent);

  if (!bodyTag) {
    throw Error(`Could not find '<body>' element in HTML file: ${htmlFileBuffer}`);
  }

  // We always have access to the source code location here because the `getHtmlBodyTagElement`
  // function explicitly has the `sourceCodeLocationInfo` option enabled.
  const endTagOffset = bodyTag.sourceCodeLocation!.endTag.startOffset;
  const startTagOffset = bodyTag.sourceCodeLocation!.startTag.endOffset;
  const indentationOffset = getChildElementIndentation(bodyTag);
  const insertion = `${' '.repeat(indentationOffset)}${elementHtml}`;

  let recordedChange: UpdateRecorder;

    if (side === 'left') {
        recordedChange = host
            .beginUpdate(htmlFilePath)
            .insertLeft(startTagOffset, `${insertion}\n`);
        host.commitUpdate(recordedChange);
    } else if (side === 'right')  {
        recordedChange = host
            .beginUpdate(htmlFilePath)
            .insertRight(endTagOffset, `${insertion}\n`);
        host.commitUpdate(recordedChange);
    }
}

/** Adds a class to the body of the document. */
export function addBodyClass(host: Tree, htmlFilePath: string, className: string): void {
  const htmlFileBuffer = host.read(htmlFilePath);

  if (!htmlFileBuffer) {
    throw new SchematicsException(`Could not read file for path: ${htmlFilePath}`);
  }

  const htmlContent = htmlFileBuffer.toString();
  const body = getElementByTagName('body', htmlContent);

  if (!body) {
    throw Error(`Could not find <body> element in HTML file: ${htmlFileBuffer}`);
  }

  const classAttribute = body.attrs.find(attribute => attribute.name === 'class');

  if (classAttribute) {
    const hasClass = classAttribute.value.split(' ').map(part => part.trim()).includes(className);

    if (!hasClass) {
      const classAttributeLocation = body.sourceCodeLocation!.attrs.class;
      const recordedChange = host
        .beginUpdate(htmlFilePath)
        .insertRight(classAttributeLocation.endOffset - 1, ` ${className}`);
      host.commitUpdate(recordedChange);
    }
  } else {
    const recordedChange = host
      .beginUpdate(htmlFilePath)
      .insertRight(body.sourceCodeLocation!.startTag.endOffset - 1, ` class="${className}"`);
    host.commitUpdate(recordedChange);
  }
}

/** Parses the given HTML file and returns the body element if available. */
export function getHtmlBodyTagElement(htmlContent: string): DefaultTreeElement | null {
  return getElementByTagName('body', htmlContent);
}

/** Finds an element by its tag name. */
function getElementByTagName(tagName: string, htmlContent: string): DefaultTreeElement | null {  
  const document = parseHtml(htmlContent, {sourceCodeLocationInfo: true}) as DefaultTreeDocument;
  const nodeQueue = [...document.childNodes];

  while (nodeQueue.length) {
    const node = nodeQueue.shift() as DefaultTreeElement;
    
    if (node.nodeName.toLowerCase() === tagName) {
      return node;
    } else if (node.childNodes) {
      nodeQueue.push(...node.childNodes);
    }
  }

  return null;
}