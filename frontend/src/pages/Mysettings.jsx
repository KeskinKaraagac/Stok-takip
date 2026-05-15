import { useEffect, useState } from "react";
import api from "../api";

export default function MySettings() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    language: "en",
    current_password: "",
    new_password: "",
  });

  const [message, setMessage] = useState("");

  useEffect(() => {
    api.get("/auth/me").then((res) => {
      setForm((prev) => ({
        ...prev,
        name: res.data.name || "",
        email: res.data.email || "",
        language: res.data.language || "en",
      }));
    });
  }, []);

  const save = async (e) => {
    e.preventDefault();

    const payload = {
      name: form.name,
      email: form.email,
      language: form.language,
    };

    if (form.new_password) {
      payload.current_password = form.current_password;
      payload.new_password = form.new_password;
    }

    try {
      await api.put("/auth/me", payload);
      localStorage.setItem("language", form.language);
      setMessage("Settings updated successfully.");
    } catch (err) {
      setMessage(err.response?.data?.detail || "Update failed.");
    }
  };

  return (
    <div className="max-w-xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">My Settings</h1>

      <form onSubmit={save} className="space-y-4">

        <div>
          <label>Name</label>
          <input
            className="w-full border rounded-lg p-2"
            value={form.name}
            onChange={(e) =>
              setForm({ ...form, name: e.target.value })
            }
          />
        </div>

        <div>
          <label>Email</label>
          <input
            className="w-full border rounded-lg p-2"
            value={form.email}
            onChange={(e) =>
              setForm({ ...form, email: e.target.value })
            }
          />
        </div>

        <div>
          <label>Language</label>
          <select
            className="w-full border rounded-lg p-2"
            value={form.language}
            onChange={(e) =>
              setForm({ ...form, language: e.target.value })
            }
          >
            <option value="en">English</option>
            <option value="tr">Türkçe</option>
          </select>
        </div>

        <hr />

        <div>
          <label>Current Password</label>
          <input
            type="password"
            className="w-full border rounded-lg p-2"
            value={form.current_password}
            onChange={(e) =>
              setForm({
                ...form,
                current_password: e.target.value,
              })
            }
          />
        </div>

        <div>
          <label>New Password</label>
          <input
            type="password"
            className="w-full border rounded-lg p-2"
            value={form.new_password}
            onChange={(e) =>
              setForm({
                ...form,
                new_password: e.target.value,
              })
            }
          />
        </div>

        <button className="bg-blue-600 text-white px-4 py-2 rounded-lg">
          Save Changes
        </button>

      </form>

      {message && (
        <p className="mt-4 text-sm">
          {message}
        </p>
      )}
    </div>
  );
}
