import type { LoopEvent } from '../webmcp-types'

const labels: Record<LoopEvent['type'], string> = {
  run_started: 'Run started',
  checkpoint: 'Checkpoint',
  blocker: 'Blocker review',
  decision: 'Decision',
  verification: 'Verification',
  stream_interrupted: 'Stream signal',
  quota_wait: 'Quota pause',
  resumed: 'Continuation',
  run_completed: 'Run completed',
  run_failed: 'Run failed',
}

export function ActivityTimeline({ events, limit = 3 }: { events: LoopEvent[]; limit?: number }) {
  const recentEvents = events.slice(-limit).reverse()

  return (
    <div className="timeline" aria-label={'Latest ' + recentEvents.length + ' of ' + events.length + ' activity events'}>
      <div className="timeline-summary"><span>LIVE SIGNAL</span><strong>{events.length} events</strong></div>
      {recentEvents.map((event) => (
        <article className="timeline-item" key={event.id} title={event.detail}>
          <span className={'timeline-dot timeline-dot-' + event.type} />
          <div className="timeline-copy">
            <div className="timeline-meta">
              <strong>{labels[event.type]}</strong>
              <time>{new Date(event.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</time>
            </div>
            <p>{event.title}</p>
          </div>
        </article>
      ))}
    </div>
  )
}
