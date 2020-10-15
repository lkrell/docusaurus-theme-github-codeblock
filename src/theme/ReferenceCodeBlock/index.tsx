import React, { useReducer } from 'react';
import CodeBlock from '@theme/CodeBlock';

import type { ReferenceCodeBlockProps, GitHubReference, DispatchMessage } from '../types'

const initialFetchResultState = {
    code: 'loading...',
    error: null,
    loading: null,
}

/**
 * parses GitHub reference
 * @param {string} ref url to github file
 */
function parseReference (ref: string): GitHubReference {
    const fullUrl = ref.slice(ref.indexOf('https'), -1)
    const [url, loc] = fullUrl.split('#')
    const [org, repo, blob, branch, ...pathSeg] = new URL(url).pathname.split('/').slice(1)
    const [fromLine, toLine] = loc
        ? loc.split('-').map((lineNr) => parseInt(lineNr.slice(1), 10))
        : [0, Infinity]

    return {
        url: `https://raw.githubusercontent.com/${org}/${repo}/${branch}/${pathSeg.join('/')}`,
        fromLine,
        toLine,
        title: pathSeg.join('/')
    }
}

async function fetchCode ({ url, fromLine, toLine }: GitHubReference, fetchResultStateDispatcher: React.Dispatch<DispatchMessage>) {
    let res: Response

    try {
        res = await fetch(url)
    } catch (err) {
        return fetchResultStateDispatcher({ type: 'error', value: err })
    }

    if (res.status !== 200) {
        const error = await res.text()
        return fetchResultStateDispatcher({ type: 'error', value: error })
    }

    const body = (await res.text()).split('\n').slice(fromLine, (toLine || fromLine) + 1).join('\n')
    return fetchResultStateDispatcher({ type: 'loaded', value: body })
}

function ReferenceCode({reference, ...props}: ReferenceCodeBlockProps) {
    const [fetchResultState, fetchResultStateDispatcher] = useReducer(
        (prevState: any, { type, value }: DispatchMessage) => {
            switch (type) {
                case 'reset': {
                return initialFetchResultState;
                }
                case 'loading': {
                return {...prevState, loading: true};
                }
                case 'loaded': {
                return {...prevState, code: value, loading: false};
                }
                case 'error': {
                return {...prevState, error: value, loading: false};
                }
                default:
                return prevState;
            }
        },
        initialFetchResultState,
    );

    const codeSnippetDetails = parseReference(reference)
    fetchCode(codeSnippetDetails, fetchResultStateDispatcher)
    props.metastring += ` title="${codeSnippetDetails.title}"`

    return (
        <div>
            <CodeBlock {...props}>{fetchResultState.code}</CodeBlock>
        </div>
    );
}

export default ReferenceCode;