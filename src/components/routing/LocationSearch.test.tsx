import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import LocationSearch from "./LocationSearch"
import { mapService } from "../../services/mapService"

/** UI redesign Phase 10: the place search works from the keyboard alone, as a WAI-ARIA combobox. */

vi.mock("../../services/mapService", () => ({ mapService: { search: vi.fn() } }))

const A = { name: "Whitefield Metro", address: "Whitefield", latitude: 12.99, longitude: 77.75 }
const B = { name: "Whitefield Bus Stop", address: "ITPL Road", latitude: 12.98, longitude: 77.74 }

function setup() {
  const onSelect = vi.fn()
  render(<LocationSearch label="Origin" placeholder="Search start location…" value={null} onSelect={onSelect} onClear={() => {}} />)
  return { onSelect, input: screen.getByRole("combobox", { name: "Origin" }) }
}

beforeEach(() => {
  vi.mocked(mapService.search).mockResolvedValue([A, B])
})

describe("LocationSearch keyboard", () => {
  it("is a combobox that says whether its list is open", async () => {
    const { input } = setup()
    expect(input).toHaveAttribute("aria-expanded", "false")
    await userEvent.type(input, "Whitefield")
    expect(await screen.findByRole("listbox", { name: "Origin suggestions" })).toBeInTheDocument()
    expect(input).toHaveAttribute("aria-expanded", "true")
    expect(screen.getAllByRole("option")).toHaveLength(2)
  })

  it("arrow keys move through the suggestions and Enter picks the highlighted one", async () => {
    const { input, onSelect } = setup()
    await userEvent.type(input, "Whitefield")
    await screen.findAllByRole("option")
    await userEvent.keyboard("{ArrowDown}")
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true")
    expect(input.getAttribute("aria-activedescendant")).toBe(screen.getAllByRole("option")[0].id)
    await userEvent.keyboard("{ArrowDown}")
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true")
    await userEvent.keyboard("{ArrowDown}") // wraps round to the first
    expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true")
    await userEvent.keyboard("{ArrowUp}") // and back to the last
    expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true")
    await userEvent.keyboard("{Enter}")
    expect(onSelect).toHaveBeenCalledWith(B)
    await waitFor(() => expect(screen.queryByRole("listbox")).toBeNull())
  })

  it("Enter with nothing highlighted does not pick a place for the user", async () => {
    const { input, onSelect } = setup()
    await userEvent.type(input, "Whitefield")
    await screen.findAllByRole("option")
    await userEvent.keyboard("{Enter}")
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("Escape closes the list without choosing, and ArrowDown opens it again", async () => {
    const { input, onSelect } = setup()
    await userEvent.type(input, "Whitefield")
    await screen.findAllByRole("option")
    await userEvent.keyboard("{Escape}")
    expect(screen.queryByRole("listbox")).toBeNull()
    expect(input).toHaveAttribute("aria-expanded", "false")
    await userEvent.keyboard("{ArrowDown}")
    expect(await screen.findByRole("listbox")).toBeInTheDocument()
    expect(onSelect).not.toHaveBeenCalled()
  })

  it("a click still picks a suggestion", async () => {
    const { input, onSelect } = setup()
    await userEvent.type(input, "Whitefield")
    await userEvent.click((await screen.findAllByRole("option"))[0])
    expect(onSelect).toHaveBeenCalledWith(A)
    expect(input).toHaveAttribute("aria-expanded", "false")
  })
})
