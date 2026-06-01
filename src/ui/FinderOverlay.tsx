import { motion, AnimatePresence } from 'framer-motion'
import { CATEGORY_LABELS, type Category, type RoomSize } from '../data/types'
import { FINDER_QUESTIONS } from '../scenes/FinderScene'

export interface FinderState {
  step: 0 | 1 | 2
  roomSize?: RoomSize
  category?: Category
}

interface Props {
  state: FinderState
  setState: (s: FinderState) => void
}

export function FinderOverlay({ state, setState }: Props) {
  if (state.step >= 2) {
    return (
      <motion.div
        className="finder-summary"
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        role="region"
        aria-label="Finder results"
      >
        <div className="finder-summary-chips">
          <span className="chip-label">Looking for</span>
          <button
            className="chip"
            onClick={() => setState({ step: 0 })}
            title="Change space"
          >
            {state.roomSize ? formatSize(state.roomSize) : 'Any space'}
            <span className="chip-edit">edit</span>
          </button>
          <button
            className="chip"
            onClick={() =>
              setState({ step: 1, roomSize: state.roomSize })
            }
            title="Change category"
          >
            {state.category ? formatCategory(state.category) : 'Anything'}
            <span className="chip-edit">edit</span>
          </button>
        </div>
        <button
          className="finder-restart"
          onClick={() => setState({ step: 0 })}
        >
          ↺ Start over
        </button>
      </motion.div>
    )
  }

  const q = FINDER_QUESTIONS[state.step as 0 | 1]
  if (!q) return null

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={state.step}
        className="finder-panel"
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        transition={{ duration: 0.25 }}
      >
        <div className="finder-step">
          <span>Step {state.step + 1} of 2</span>
          {state.step > 0 && (
            <button
              className="finder-back"
              onClick={() => setState({ step: 0 })}
            >
              ← Back
            </button>
          )}
        </div>
        <h2 className="finder-title">{q.title}</h2>
        <div className="finder-choices">
          {q.options.map((opt) => (
            <button
              key={String(opt.label)}
              className="finder-choice"
              onClick={() => {
                if (state.step === 0) {
                  setState({
                    step: 1,
                    roomSize: opt.value as RoomSize,
                  })
                } else {
                  setState({
                    step: 2,
                    roomSize: state.roomSize,
                    category: opt.value as Category | undefined,
                  })
                }
              }}
            >
              <span className="finder-choice-label">{opt.label}</span>
              <span className="finder-choice-hint">{opt.hint}</span>
            </button>
          ))}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}

function formatSize(s: RoomSize) {
  return {
    personal: 'Personal / desk',
    mobile: 'On the go',
    huddle: 'Huddle',
    small: 'Small room',
    medium: 'Medium room',
    large: 'Large room',
    auditorium: 'Auditorium',
  }[s]
}
function formatCategory(c: Category) {
  return CATEGORY_LABELS[c]
}
