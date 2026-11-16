import { describe, it, expect, vi } from "vitest"
import { render, screen, fireEvent, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import PlannerSheet, { atLeast, lowerSnap, raiseSnap } from "./PlannerSheet"
import ProfilePicker, { type ProfileOption } from "./ProfilePicker"
import DepartureControl from "./DepartureControl"
import DemoOptions from "./DemoOptions"
import ResultsSkeleton from "./ResultsSkeleton"
import { OSM_TILES, cartoVoyagerTiles, pickStreetTiles } from "../map/mapTiles"

/** The parts of the map-first Plan Trip screen (UI redesign Phase 5). */

describe("sheet heights", () => {
  it("steps up and down through peek, half and full, and stops at the ends", () => {
    expect(raiseSnap("peek")).toBe("half")
    expect(raiseSnap("half")).toBe("full")
    expect(raiseSnap("full")).toBe("full")
    expect(lowerSnap("full")).toBe("half")
    expect(lowerSnap("peek")).toBe("peek")
  })

  it("'at least' raises but never lowers", () => {
    expect(atLeast("peek", "half")).toBe("half")
    expect(atLeast("half", "half")).toBe("half")
    expect(atLeast("full", "half")).toBe("full")
  })
})

describe("PlannerSheet", () => {
  it("is one named region with its content and a handle", () => {
    render(<PlannerSheet snap="half" onSnapChange={() => {}}><p>Form goes here</p></PlannerSheet>)
    const panel = screen.getByRole("complementary", { name: "Journey planner" })
    expect(panel).toHaveAttribute("data-snap", "half")
    expect(within(panel).getByText("Form goes here")).toBeInTheDocument()
    expect(within(panel).getByRole("button", { name: "Expand the journey panel" })).toBeInTheDocument()
  })

  it("has a different phone height for each snap, and is a plain column from 1024 px up", () => {
    const { rerender } = render(<PlannerSheet snap="peek" onSnapChange={() => {}}>x</PlannerSheet>)
    const cls = () => screen.getByRole("complementary").className
    expect(cls()).toContain("max-lg:h-[13.5rem]")
    rerender(<PlannerSheet snap="half" onSnapChange={() => {}}>x</PlannerSheet>)
    expect(cls()).toContain("max-lg:h-[58%]")
    rerender(<PlannerSheet snap="full" onSnapChange={() => {}}>x</PlannerSheet>)
    expect(cls()).toContain("max-lg:h-[94%]")
    expect(cls()).toContain("lg:static")
    expect(cls()).toContain("lg:h-full")
    expect(screen.getByRole("button", { name: "Collapse the journey panel" }).parentElement!.className).toContain("lg:hidden")
  })

  it("tapping the handle steps up, and from full goes back down to a peek", async () => {
    const user = userEvent.setup()
    const onSnapChange = vi.fn()
    const { rerender } = render(<PlannerSheet snap="peek" onSnapChange={onSnapChange}>x</PlannerSheet>)
    await user.click(screen.getByRole("button", { name: "Expand the journey panel" }))
    expect(onSnapChange).toHaveBeenLastCalledWith("half")
    rerender(<PlannerSheet snap="half" onSnapChange={onSnapChange}>x</PlannerSheet>)
    await user.click(screen.getByRole("button", { name: "Expand the journey panel" }))
    expect(onSnapChange).toHaveBeenLastCalledWith("full")
    rerender(<PlannerSheet snap="full" onSnapChange={onSnapChange}>x</PlannerSheet>)
    await user.click(screen.getByRole("button", { name: "Collapse the journey panel" }))
    expect(onSnapChange).toHaveBeenLastCalledWith("peek")
  })

  it("the arrow keys on the handle change the height (no pointer needed)", () => {
    const onSnapChange = vi.fn()
    render(<PlannerSheet snap="half" onSnapChange={onSnapChange}>x</PlannerSheet>)
    const handle = screen.getByRole("button", { name: "Expand the journey panel" })
    fireEvent.keyDown(handle, { key: "ArrowUp" })
    expect(onSnapChange).toHaveBeenLastCalledWith("full")
    fireEvent.keyDown(handle, { key: "ArrowDown" })
    expect(onSnapChange).toHaveBeenLastCalledWith("peek")
  })

  it("dragging the handle up raises it and dragging down lowers it, without also counting as a tap", () => {
    const onSnapChange = vi.fn()
    render(<PlannerSheet snap="half" onSnapChange={onSnapChange}>x</PlannerSheet>)
    const handle = screen.getByRole("button", { name: "Expand the journey panel" })
    fireEvent.pointerDown(handle, { clientY: 400, pointerId: 1 })
    fireEvent.pointerUp(handle, { clientY: 300, pointerId: 1 })
    fireEvent.click(handle) // the click the browser sends after a drag is ignored
    expect(onSnapChange).toHaveBeenCalledTimes(1)
    expect(onSnapChange).toHaveBeenLastCalledWith("full")
    fireEvent.pointerDown(handle, { clientY: 300, pointerId: 1 })
    fireEvent.pointerUp(handle, { clientY: 420, pointerId: 1 })
    expect(onSnapChange).toHaveBeenLastCalledWith("peek")
  })
})

const PROFILES: ProfileOption[] = [
  { id: "standard", label: "Standard", description: "Balanced." },
  { id: "wheelchair", label: "Wheelchair", description: "Step-free." },
  { id: "senior", label: "Senior", description: "Fewer stairs." },
  { id: "pregnant", label: "Pregnant", description: "Minimal walking." },
  { id: "stroller", label: "Stroller", description: "Ramp or lift." },
  { id: "luggage", label: "Luggage", description: "Less walking." },
  { id: "reduced_mobility", label: "Reduced Mobility", description: "Lower effort." },
  { id: "fastest", label: "Fastest", description: "Minimum time." },
  { id: "cheapest", label: "Cheapest", description: "Minimum fare." },
  { id: "comfort", label: "Comfort", description: "Low crowds." },
]

describe("ProfilePicker", () => {
  it("shows the five common profiles and a More button, and marks the chosen one", () => {
    render(<ProfilePicker profiles={PROFILES} value="standard" onChange={() => {}} />)
    const group = screen.getByRole("group", { name: "Accessibility Profile" })
    for (const name of ["Standard", "Wheelchair", "Senior", "Pregnant", "Stroller", "More"]) expect(within(group).getByRole("button", { name })).toBeInTheDocument()
    for (const name of ["Luggage", "Fastest", "Cheapest"]) expect(within(group).queryByRole("button", { name })).toBeNull()
    expect(within(group).getByRole("button", { name: "Standard" })).toHaveAttribute("aria-pressed", "true")
    expect(within(group).getByRole("button", { name: "Standard" }).className).toContain("bg-brand-500")
    expect(within(group).getByRole("button", { name: "Wheelchair" })).toHaveAttribute("aria-pressed", "false")
    expect(within(group).getByText("Balanced.")).toBeInTheDocument() // the description of the chosen profile
  })

  it("choosing in the row reports it", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ProfilePicker profiles={PROFILES} value="standard" onChange={onChange} />)
    await user.click(screen.getByRole("button", { name: "Wheelchair" }))
    expect(onChange).toHaveBeenCalledWith("wheelchair")
  })

  it("More opens every profile with its description; choosing one reports it and closes the sheet", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<ProfilePicker profiles={PROFILES} value="standard" onChange={onChange} />)
    await user.click(screen.getByRole("button", { name: "More" }))
    const dialog = screen.getByRole("dialog", { name: "Travel profile" })
    expect(within(dialog).getAllByRole("button").filter((b) => b.hasAttribute("aria-pressed"))).toHaveLength(10)
    expect(within(dialog).getByText("Minimum fare.")).toBeInTheDocument()
    await user.click(within(dialog).getByRole("button", { name: /Fastest/ }))
    expect(onChange).toHaveBeenCalledWith("fastest")
    expect(screen.queryByRole("dialog")).toBeNull()
  })

  it("a profile that is not in the row joins it when chosen, so the choice is always visible", () => {
    render(<ProfilePicker profiles={PROFILES} value="fastest" onChange={() => {}} />)
    expect(screen.getByRole("button", { name: "Fastest" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.queryByRole("button", { name: "Cheapest" })).toBeNull()
  })
})

describe("DepartureControl", () => {
  it("starts on Leave now with no date or time fields", () => {
    render(<DepartureControl date="" time="" onChange={() => {}} />)
    expect(screen.getByRole("group", { name: "Departure" })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Leave now" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.queryByLabelText("Date")).toBeNull()
  })

  it("Depart at fills in today and the current time, and shows the two fields", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DepartureControl date="" time="" onChange={onChange} />)
    await user.click(screen.getByRole("button", { name: "Depart at" }))
    expect(screen.getByLabelText("Date")).toBeInTheDocument()
    expect(screen.getByLabelText("Time")).toBeInTheDocument()
    const { date, time } = onChange.mock.calls[0][0] as { date: string; time: string }
    expect(date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(time).toMatch(/^\d{2}:\d{2}$/)
  })

  it("starts on Depart at when a time is already chosen, and Leave now clears both", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    render(<DepartureControl date="2026-11-17" time="08:30" onChange={onChange} />)
    expect(screen.getByRole("button", { name: "Depart at" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByLabelText("Time")).toHaveValue("08:30")
    await user.click(screen.getByRole("button", { name: "Leave now" }))
    expect(onChange).toHaveBeenLastCalledWith({ date: "", time: "" })
    expect(screen.queryByLabelText("Date")).toBeNull()
  })

  it("changing one field keeps the other", () => {
    const onChange = vi.fn()
    render(<DepartureControl date="2026-11-17" time="08:30" onChange={onChange} />)
    fireEvent.change(screen.getByLabelText("Time"), { target: { value: "09:15" } })
    expect(onChange).toHaveBeenLastCalledWith({ date: "2026-11-17", time: "09:15" })
    fireEvent.change(screen.getByLabelText("Date"), { target: { value: "2026-11-18" } })
    expect(onChange).toHaveBeenLastCalledWith({ date: "2026-11-18", time: "08:30" })
  })
})

describe("DemoOptions", () => {
  const OPTIONS = [{ id: "live", label: "Live weather" }, { id: "rain", label: "Rain" }]

  it("is closed to begin with, and the closed line still says which weather is chosen", () => {
    render(<DemoOptions options={OPTIONS} value="rain" onChange={() => {}} />)
    const toggle = screen.getByRole("button", { name: /Demo options/ })
    expect(toggle).toHaveAttribute("aria-expanded", "false")
    expect(toggle).toHaveTextContent("Weather: Rain")
    expect(screen.queryByRole("group", { name: /Weather/ })).toBeNull()
  })

  it("opens to the weather choices, explains each, and reports a change", async () => {
    const user = userEvent.setup()
    const onChange = vi.fn()
    const { rerender } = render(<DemoOptions options={OPTIONS} value="live" onChange={onChange} />)
    await user.click(screen.getByRole("button", { name: /Demo options/ }))
    const group = screen.getByRole("group", { name: /Weather/ })
    expect(group).toHaveTextContent("demo options for showing the rules")
    expect(group).toHaveTextContent("Uses the real weather")
    expect(within(group).getByRole("button", { name: "Live weather" })).toHaveAttribute("aria-pressed", "true")
    await user.click(within(group).getByRole("button", { name: "Rain" }))
    expect(onChange).toHaveBeenCalledWith("rain")
    rerender(<DemoOptions options={OPTIONS} value="rain" onChange={onChange} />)
    expect(screen.getByRole("group", { name: /Weather/ })).toHaveTextContent("walks over 300 m become autos")
  })
})

describe("ResultsSkeleton", () => {
  it("announces the search once and names its steps, for each kind of search", () => {
    const { rerender } = render(<ResultsSkeleton mode="multimodal" />)
    const status = screen.getByRole("status")
    expect(status).toHaveTextContent("Finding the best available routes…")
    expect(status).toHaveTextContent("Locating nearby metro stations…")
    expect(status).toHaveTextContent("Checking bus connections…")
    rerender(<ResultsSkeleton mode="road" />)
    expect(screen.getByRole("status")).toHaveTextContent("Calculating route…")
    expect(screen.getByRole("status")).toHaveTextContent("Querying routing service…")
  })

  it("the grey cards are hidden from screen readers", () => {
    const { container } = render(<ResultsSkeleton mode="multimodal" />)
    expect(container.querySelectorAll('[aria-hidden="true"].shadow-card')).toHaveLength(2)
  })
})

describe("map tiles", () => {
  it("uses standard OpenStreetMap tiles unless a CARTO key is given", () => {
    expect(pickStreetTiles(undefined)).toBe(OSM_TILES)
    expect(pickStreetTiles("")).toBe(OSM_TILES)
    expect(pickStreetTiles("   ")).toBe(OSM_TILES)
    expect(OSM_TILES.url).toContain("tile.openstreetmap.org")
    expect(OSM_TILES.attribution).toContain("OpenStreetMap")
  })

  it("uses CARTO Voyager only with a key, always sends the key, and credits both OpenStreetMap and CARTO", () => {
    const t = pickStreetTiles("my key&1")
    expect(t.name).toBe("CARTO Voyager")
    expect(t.url).toContain("basemaps.cartocdn.com/rastertiles/voyager")
    expect(t.url).toContain("?key=my%20key%261")
    expect(t.attribution).toContain("OpenStreetMap")
    expect(t.attribution).toContain("CARTO")
    expect(cartoVoyagerTiles("abc").url.endsWith("?key=abc")).toBe(true)
  })
})
