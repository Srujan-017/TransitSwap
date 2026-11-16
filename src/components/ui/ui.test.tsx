import { describe, it, expect, vi, afterEach } from "vitest"
import { render, screen, fireEvent, act } from "@testing-library/react"
import { useState } from "react"
import Avatar, { initialsOf } from "./Avatar"
import Button from "./Button"
import Chip from "./Chip"
import CrowdPill from "./CrowdPill"
import EmptyState from "./EmptyState"
import IconButton from "./IconButton"
import LineBadge from "./LineBadge"
import ModeIcon from "./ModeIcon"
import ProfileIcon, { PROFILE_ICONS } from "./ProfileIcon"
import SegmentedControl from "./SegmentedControl"
import Sheet from "./Sheet"
import Skeleton from "./Skeleton"
import StatTile from "./StatTile"
import Tabs from "./Tabs"
import Toast from "./Toast"

/** The shared kit introduced in UI redesign Phase 1: what each piece renders and how it behaves from the keyboard. */

afterEach(() => { vi.useRealTimers() })

describe("ProfileIcon and ModeIcon", () => {
  it("has a lucide icon for every travel profile and routing priority, never an emoji", () => {
    const ids = ["standard", "wheelchair", "senior", "pregnant", "stroller", "luggage", "reduced_mobility", "fastest", "cheapest", "comfort"]
    for (const id of ids) {
      expect(PROFILE_ICONS[id], id).toBeDefined()
      const { container, unmount } = render(<ProfileIcon id={id} />)
      const svg = container.querySelector("svg")!
      expect(svg).not.toBeNull()
      expect(svg.getAttribute("aria-hidden")).toBe("true")
      expect(container.textContent).toBe("")
      unmount()
    }
  })

  it("falls back to a sensible icon for an unknown id", () => {
    const { container } = render(<ProfileIcon id="something-new" />)
    expect(container.querySelector("svg")).not.toBeNull()
  })

  it("can be exposed to screen readers when it is the only content", () => {
    const { container } = render(<ProfileIcon id="standard" decorative={false} />)
    expect(container.querySelector("svg")!.hasAttribute("aria-hidden")).toBe(false)
  })

  it("shows the access symbol for a wheelchair walking leg and the usual icon otherwise", () => {
    const walking = render(<ModeIcon mode="walking" />)
    const wheel = render(<ModeIcon mode="walking" wheelchair />)
    expect(walking.container.innerHTML).not.toEqual(wheel.container.innerHTML)
    const bus = render(<ModeIcon mode="bus" wheelchair />)
    expect(bus.container.querySelector("svg")!.getAttribute("data-mode-icon")).toBe("bus")
  })
})

describe("Button", () => {
  it("keeps its props: variants, loading state and disabled", () => {
    const onClick = vi.fn()
    const { rerender } = render(<Button onClick={onClick}>Find Routes</Button>)
    fireEvent.click(screen.getByRole("button", { name: "Find Routes" }))
    expect(onClick).toHaveBeenCalledTimes(1)
    rerender(<Button onClick={onClick} loading>Find Routes</Button>)
    expect(screen.getByRole("button")).toBeDisabled()
    expect(screen.getByRole("button")).toHaveTextContent("Loading…")
  })

  it("has a Go Green variant for Start", () => {
    render(<Button variant="go">Start Journey</Button>)
    expect(screen.getByRole("button", { name: "Start Journey" }).className).toContain("bg-go-600")
  })
})

describe("Chip and SegmentedControl", () => {
  it("a chip is a toggle button", () => {
    const onClick = vi.fn()
    const { rerender } = render(<Chip onClick={onClick}>Wheelchair</Chip>)
    const chip = screen.getByRole("button", { name: "Wheelchair" })
    expect(chip).toHaveAttribute("aria-pressed", "false")
    fireEvent.click(chip)
    expect(onClick).toHaveBeenCalled()
    rerender(<Chip selected>Wheelchair</Chip>)
    expect(screen.getByRole("button", { name: "Wheelchair" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Wheelchair" }).className).toContain("bg-brand-500")
  })

  it("a segmented control marks the chosen option and reports changes", () => {
    const onChange = vi.fn()
    render(<SegmentedControl ariaLabel="Routing mode" value="multimodal" onChange={onChange} options={[{ value: "multimodal", label: "Multimodal" }, { value: "road", label: "Road Routing" }]} />)
    expect(screen.getByRole("group", { name: "Routing mode" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Multimodal" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Road Routing" })).toHaveAttribute("aria-pressed", "false")
    fireEvent.click(screen.getByRole("button", { name: "Road Routing" }))
    expect(onChange).toHaveBeenCalledWith("road")
  })
})

describe("IconButton", () => {
  it("always has an accessible name and a tooltip", () => {
    render(<IconButton label="Re-centre map"><svg /></IconButton>)
    const b = screen.getByRole("button", { name: "Re-centre map" })
    expect(b).toHaveAttribute("title", "Re-centre map")
  })
})

describe("LineBadge and CrowdPill", () => {
  it("a bus badge shows the number and says 'Bus number 356' to screen readers", () => {
    render(<LineBadge mode="bus" label="356" srLabel="Bus number 356" />)
    expect(screen.getByText("Bus number 356")).toHaveClass("sr-only")
    expect(screen.getByText("356")).toHaveAttribute("aria-hidden", "true")
  })

  it("a metro badge shows the line colour as a dot, never as the text colour", () => {
    const { container } = render(<LineBadge mode="metro" label="Yellow Line" color="#f5b800" />)
    const dot = container.querySelector("span[aria-hidden='true']") as HTMLElement
    expect(dot.style.backgroundColor).not.toBe("")
    expect(screen.getByText("Yellow Line").closest("span")!.className).toContain("text-navy-900")
  })

  it("crowd is a word and an icon, not just a colour", () => {
    const { container, rerender } = render(<CrowdPill level="HIGH" />)
    expect(screen.getByText("High crowd")).toBeInTheDocument()
    expect(container.querySelector("svg")).not.toBeNull()
    rerender(<CrowdPill level="LOW" label="Crowd: LOW" />)
    expect(screen.getByText("Crowd: LOW")).toBeInTheDocument()
  })
})

describe("Sheet", () => {
  function Harness() {
    const [open, setOpen] = useState(false)
    return (
      <>
        <button onClick={() => setOpen(true)}>Open options</button>
        <Sheet open={open} onClose={() => setOpen(false)} title="More profiles">
          <button>First</button>
          <button>Last</button>
        </Sheet>
      </>
    )
  }

  it("opens as a named modal dialog, closes with Escape, and returns focus to what opened it", () => {
    render(<Harness />)
    expect(screen.queryByRole("dialog")).toBeNull()
    const opener = screen.getByRole("button", { name: "Open options" })
    opener.focus()
    fireEvent.click(opener)
    const dialog = screen.getByRole("dialog", { name: "More profiles" })
    expect(dialog).toHaveAttribute("aria-modal", "true")
    fireEvent.keyDown(document, { key: "Escape" })
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(document.activeElement).toBe(opener)
  })

  it("closes with its Close button", () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole("button", { name: "Open options" }))
    fireEvent.click(screen.getByRole("button", { name: "Close" }))
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("keeps Tab inside the dialog", () => {
    render(<Harness />)
    fireEvent.click(screen.getByRole("button", { name: "Open options" }))
    const last = screen.getByRole("button", { name: "Last" })
    last.focus()
    fireEvent.keyDown(document, { key: "Tab" })
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close" }))
    fireEvent.keyDown(document, { key: "Tab", shiftKey: true })
    expect(document.activeElement).toBe(last)
  })
})

describe("Tabs", () => {
  function Harness() {
    const [value, setValue] = useState("a")
    return <Tabs ariaLabel="Sections" value={value} onChange={setValue} items={[{ id: "a", label: "Alpha", content: <p>Alpha content</p> }, { id: "b", label: "Beta", content: <p>Beta content</p> }, { id: "c", label: "Gamma", content: <p>Gamma content</p> }]} />
  }

  it("shows only the selected panel and follows the arrow, Home and End keys", () => {
    render(<Harness />)
    expect(screen.getByRole("tablist", { name: "Sections" })).toBeInTheDocument()
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByText("Alpha content")).toBeInTheDocument()
    expect(screen.queryByText("Beta content")).toBeNull()

    fireEvent.keyDown(screen.getByRole("tab", { name: "Alpha" }), { key: "ArrowRight" })
    expect(screen.getByRole("tab", { name: "Beta" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByText("Beta content")).toBeInTheDocument()
    fireEvent.keyDown(screen.getByRole("tab", { name: "Beta" }), { key: "End" })
    expect(screen.getByRole("tab", { name: "Gamma" })).toHaveAttribute("aria-selected", "true")
    fireEvent.keyDown(screen.getByRole("tab", { name: "Gamma" }), { key: "ArrowRight" })
    expect(screen.getByRole("tab", { name: "Alpha" })).toHaveAttribute("aria-selected", "true")
    expect(screen.getByRole("tabpanel")).toHaveAttribute("aria-labelledby", screen.getByRole("tab", { name: "Alpha" }).id)
  })
})

describe("Toast", () => {
  it("is announced politely and closes itself after its time", () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(<Toast onClose={onClose} duration={3000}>Journey saved</Toast>)
    expect(screen.getByRole("status")).toHaveTextContent("Journey saved")
    act(() => { vi.advanceTimersByTime(2999) })
    expect(onClose).not.toHaveBeenCalled()
    act(() => { vi.advanceTimersByTime(2) })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it("an error is announced as an alert and does not close by itself", () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    render(<Toast tone="error" onClose={onClose}>Could not save</Toast>)
    expect(screen.getByRole("alert")).toHaveTextContent("Could not save")
    act(() => { vi.advanceTimersByTime(60_000) })
    expect(onClose).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole("button", { name: "Dismiss" }))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})

describe("small pieces", () => {
  it("Avatar makes initials from the name and is decorative", () => {
    expect(initialsOf("Asha Rao")).toBe("AR")
    expect(initialsOf("  madonna ")).toBe("M")
    expect(initialsOf("Mary Ann Smith")).toBe("MS")
    expect(initialsOf("")).toBe("?")
    const { container } = render(<Avatar name="Asha Rao" />)
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
    expect(container.textContent).toBe("AR")
  })

  it("Skeleton is hidden from screen readers", () => {
    const { container } = render(<Skeleton lines={3} />)
    expect(container.firstElementChild).toHaveAttribute("aria-hidden", "true")
    expect(container.querySelectorAll(".skeleton")).toHaveLength(3)
  })

  it("EmptyState names what is missing and offers the next step", () => {
    render(<EmptyState title="No saved routes yet" description="Plan a trip and save it." action={<button>Plan a trip</button>} />)
    expect(screen.getByRole("heading", { name: "No saved routes yet" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Plan a trip" })).toBeInTheDocument()
  })

  it("StatTile shows the label, number and hint", () => {
    render(<StatTile label="Trips this month" value="12" hint="3 more than last month" />)
    expect(screen.getByText("Trips this month")).toBeInTheDocument()
    expect(screen.getByText("12")).toHaveClass("tabular-nums")
    expect(screen.getByText("3 more than last month")).toBeInTheDocument()
  })
})
