import Markdown, { type Components } from 'react-markdown'
import remarkGfm from 'remark-gfm'

type NoteMarkdownProps = {
  content: string
  className?: string
}

const components: Components = {
  h1: (props) => <h1 className="mb-4 mt-7 border-b border-white/10 pb-2 text-3xl font-bold text-white first:mt-0" {...props} />,
  h2: (props) => <h2 className="mb-3 mt-6 border-b border-white/10 pb-2 text-2xl font-bold text-white first:mt-0" {...props} />,
  h3: (props) => <h3 className="mb-2 mt-5 text-xl font-semibold text-white first:mt-0" {...props} />,
  h4: (props) => <h4 className="mb-2 mt-4 text-lg font-semibold text-white first:mt-0" {...props} />,
  p: (props) => <p className="my-3 whitespace-pre-wrap break-words leading-7 text-slate-200 first:mt-0 last:mb-0" {...props} />,
  strong: (props) => <strong className="font-bold text-white" {...props} />,
  em: (props) => <em className="italic text-slate-100" {...props} />,
  ul: (props) => <ul className="my-3 list-disc space-y-1.5 pl-6 text-slate-200" {...props} />,
  ol: (props) => <ol className="my-3 list-decimal space-y-1.5 pl-6 text-slate-200" {...props} />,
  li: (props) => <li className="pl-1 leading-7 marker:text-cyan-300" {...props} />,
  blockquote: (props) => <blockquote className="my-4 border-l-4 border-cyan-300/50 bg-cyan-300/5 px-4 py-2 italic text-slate-300" {...props} />,
  a: (props) => <a className="font-medium text-cyan-300 underline decoration-cyan-300/50 underline-offset-2 transition hover:text-cyan-200" target="_blank" rel="noreferrer" {...props} />,
  code: ({ className, ...props }) => <code className={`${className ?? ''} rounded bg-white/10 px-1.5 py-0.5 font-mono text-[0.9em] text-cyan-100`} {...props} />,
  pre: (props) => <pre className="my-4 overflow-x-auto rounded-lg border border-white/10 bg-slate-900 p-4 text-sm leading-6" {...props} />,
  hr: (props) => <hr className="my-6 border-white/15" {...props} />,
  table: (props) => <table className="my-4 w-full min-w-[32rem] border-collapse text-left text-sm" {...props} />,
  thead: (props) => <thead className="bg-white/[0.06] text-white" {...props} />,
  th: (props) => <th className="border border-white/15 px-3 py-2 font-semibold" {...props} />,
  td: (props) => <td className="border border-white/15 px-3 py-2 text-slate-200" {...props} />,
  input: (props) => <input className="mr-2 h-4 w-4 accent-cyan-300" disabled {...props} />,
}

export function NoteMarkdown({ content, className = '' }: NoteMarkdownProps) {
  if (!content.trim()) {
    return <p className={`text-sm text-slate-400 ${className}`}>No note text yet.</p>
  }

  return (
    <div className={`min-w-0 overflow-x-auto text-sm ${className}`}>
      <Markdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </Markdown>
    </div>
  )
}
