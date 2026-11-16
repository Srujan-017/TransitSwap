import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom"
import LoginPage from "./LoginPage"
import RegisterPage from "./RegisterPage"

/** Sign-in and sign-up after the UI redesign (Phase 4): the form behaviour is exactly what it was. */

const auth = vi.hoisted(() => ({ login: vi.fn(), register: vi.fn() }))
vi.mock("../context/AuthContext", () => ({ useAuthContext: () => ({ login: auth.login, register: auth.register }) }))

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>
}

function renderAt(path: string, state?: unknown) {
  return render(
    <MemoryRouter initialEntries={[{ pathname: path, state }]}>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  auth.login.mockReset()
  auth.register.mockReset()
})

describe("sign in", () => {
  it("asks for an email and a password, and offers the demo account", () => {
    renderAt("/login")
    expect(screen.getByRole("heading", { level: 1, name: "Welcome back" })).toBeInTheDocument()
    expect(screen.getByLabelText("Email address")).toBeInTheDocument()
    expect(screen.getByLabelText("Password")).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Sign In" })).toBeInTheDocument()
    expect(screen.getByText("demo@transitswap.app")).toBeInTheDocument()
    expect(screen.getByRole("link", { name: "Create one free" })).toHaveAttribute("href", "/register")
  })

  it("tells the visitor, as an alert, when something is missing", async () => {
    const user = userEvent.setup()
    renderAt("/login")
    await user.click(screen.getByRole("button", { name: "Sign In" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Please fill in all fields.")
    expect(auth.login).not.toHaveBeenCalled()
  })

  it("signs in and goes to the dashboard", async () => {
    const user = userEvent.setup()
    auth.login.mockResolvedValue(undefined)
    renderAt("/login")
    await user.type(screen.getByLabelText("Email address"), "asha@example.test")
    await user.type(screen.getByLabelText("Password"), "Secret#123")
    await user.click(screen.getByRole("button", { name: "Sign In" }))
    expect(auth.login).toHaveBeenCalledWith({ email: "asha@example.test", password: "Secret#123" })
    expect(await screen.findByTestId("where")).toHaveTextContent("/dashboard")
  })

  it("returns to the page the visitor was sent away from", async () => {
    const user = userEvent.setup()
    auth.login.mockResolvedValue(undefined)
    renderAt("/login", { from: "/history" })
    await user.type(screen.getByLabelText("Email address"), "asha@example.test")
    await user.type(screen.getByLabelText("Password"), "Secret#123")
    await user.click(screen.getByRole("button", { name: "Sign In" }))
    expect(await screen.findByTestId("where")).toHaveTextContent("/history")
  })

  it("shows the real reason when sign-in fails", async () => {
    const user = userEvent.setup()
    auth.login.mockRejectedValue(new Error("Invalid email or password"))
    renderAt("/login")
    await user.type(screen.getByLabelText("Email address"), "asha@example.test")
    await user.type(screen.getByLabelText("Password"), "wrong")
    await user.click(screen.getByRole("button", { name: "Sign In" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("Invalid email or password")
    expect(screen.queryByTestId("where")).toBeNull()
  })

  it("shows and hides the password", async () => {
    const user = userEvent.setup()
    renderAt("/login")
    const field = screen.getByLabelText("Password")
    expect(field).toHaveAttribute("type", "password")
    await user.click(screen.getByRole("button", { name: "Show password" }))
    expect(field).toHaveAttribute("type", "text")
    expect(screen.getByRole("button", { name: "Hide password" })).toHaveAttribute("aria-pressed", "true")
  })

  it("fills in the demo account on request", async () => {
    const user = userEvent.setup()
    renderAt("/login")
    await user.click(screen.getByRole("button", { name: "Fill in the demo account" }))
    expect(screen.getByLabelText("Email address")).toHaveValue("demo@transitswap.app")
    expect(screen.getByLabelText("Password")).toHaveValue("Demo@1234")
  })
})

describe("sign up", () => {
  async function fill(user: ReturnType<typeof userEvent.setup>, over: Partial<Record<"name" | "email" | "password" | "confirm", string>> = {}) {
    await user.type(screen.getByLabelText("Full name"), over.name ?? "Asha Rao")
    await user.type(screen.getByLabelText("Email address"), over.email ?? "asha@example.test")
    await user.type(screen.getByLabelText("Password", { exact: true }), over.password ?? "Secret#123")
    await user.type(screen.getByLabelText("Confirm password"), over.confirm ?? over.password ?? "Secret#123")
  }

  it("has the four fields and the button the end-to-end test uses", () => {
    renderAt("/register")
    expect(screen.getByRole("heading", { level: 1, name: "Create your account" })).toBeInTheDocument()
    for (const label of ["Full name", "Email address", "Confirm password"]) expect(screen.getByLabelText(label)).toBeInTheDocument()
    expect(screen.getByLabelText("Password", { exact: true })).toBeInTheDocument()
    expect(screen.getByRole("button", { name: "Create Account" })).toBeInTheDocument()
  })

  it("validates before it asks the server", async () => {
    const user = userEvent.setup()
    renderAt("/register")
    await user.click(screen.getByRole("button", { name: "Create Account" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Please fill in all required fields.")
    await fill(user, { password: "short", confirm: "short" })
    await user.click(screen.getByRole("button", { name: "Create Account" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Password must be at least 8 characters.")
    expect(auth.register).not.toHaveBeenCalled()
  })

  it("catches passwords that do not match", async () => {
    const user = userEvent.setup()
    renderAt("/register")
    await fill(user, { password: "Secret#123", confirm: "Secret#124" })
    expect(screen.getByText("Passwords do not match")).toBeInTheDocument() // beside the field, as it is typed
    await user.click(screen.getByRole("button", { name: "Create Account" }))
    expect(screen.getByRole("alert")).toHaveTextContent("Passwords do not match.")
    expect(auth.register).not.toHaveBeenCalled()
  })

  it("rates the password as it is typed", async () => {
    const user = userEvent.setup()
    renderAt("/register")
    const field = screen.getByLabelText("Password", { exact: true })
    await user.type(field, "abc")
    expect(screen.getByText("Weak")).toBeInTheDocument()
    await user.type(field, "defgh")
    expect(screen.getByText("Fair")).toBeInTheDocument()
    await user.type(field, "ijk")
    expect(screen.getByText("Strong")).toBeInTheDocument()
  })

  it("creates the account with the chosen accessibility profile and goes to the dashboard", async () => {
    const user = userEvent.setup()
    auth.register.mockResolvedValue(undefined)
    renderAt("/register")
    expect(screen.getByRole("button", { name: "Standard" })).toHaveAttribute("aria-pressed", "true")
    await user.click(screen.getByRole("button", { name: "Wheelchair" }))
    expect(screen.getByRole("button", { name: "Wheelchair" })).toHaveAttribute("aria-pressed", "true")
    expect(screen.getByRole("button", { name: "Wheelchair" }).className).toContain("bg-brand-500")
    expect(screen.getByRole("button", { name: "Standard" })).toHaveAttribute("aria-pressed", "false")
    await fill(user)
    await user.click(screen.getByRole("button", { name: "Create Account" }))
    expect(auth.register).toHaveBeenCalledWith({ name: "Asha Rao", email: "asha@example.test", password: "Secret#123", accessibilityProfile: "wheelchair" })
    expect(await screen.findByTestId("where")).toHaveTextContent("/dashboard")
  })

  it("shows the real reason when sign-up fails", async () => {
    const user = userEvent.setup()
    auth.register.mockRejectedValue(new Error("An account with this email already exists"))
    renderAt("/register")
    await fill(user)
    await user.click(screen.getByRole("button", { name: "Create Account" }))
    expect(await screen.findByRole("alert")).toHaveTextContent("An account with this email already exists")
  })

  it("links back to sign in", () => {
    renderAt("/register")
    expect(screen.getByRole("link", { name: "Sign in" })).toHaveAttribute("href", "/login")
  })
})
