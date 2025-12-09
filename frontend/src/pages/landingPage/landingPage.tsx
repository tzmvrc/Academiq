import { Link } from "react-router-dom";
import { FaComments, FaCheckCircle, FaBrain } from "react-icons/fa";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col">

      {/* ===== HERO SECTION ===== */}
      <section className="px-6 lg:px-20 py-20 bg-white">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-2 gap-10 items-center">

          {/* Text */}
          <div>
            <h1 className="text-4xl lg:text-6xl font-bold leading-tight">
              Elevate Academic Discussions with <span className="text-blue-600">Academiq</span>
            </h1>

            <p className="mt-6 text-lg text-gray-600">
              A smart AI-powered academic forum designed to support students, enhance collaboration, 
              and ensure meaningful, validated academic discourse.
            </p>

            <div className="mt-8 flex gap-4">
              <Link
                to="/forum"
                className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition shadow-md"
              >
                Go to Forum
              </Link>

              <Link
                to="/points-tester"
                className="px-6 py-3 border border-blue-600 text-blue-600 rounded-xl hover:bg-blue-50 transition"
              >
                Try Points AI
              </Link>
            </div>
          </div>

          {/* Hero Image Placeholder */}
          <div className="relative flex justify-center">
            <div className="w-72 h-72 lg:w-96 lg:h-96 bg-blue-100 rounded-3xl shadow-inner flex items-center justify-center">
              <span className="text-6xl text-blue-500 font-bold">A</span>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES SECTION ===== */}
      <section className="px-6 lg:px-20 py-16 bg-gray-50">
        <h2 className="text-3xl lg:text-4xl font-bold text-center mb-12">
          Why Choose <span className="text-blue-600">Academiq</span>?
        </h2>

        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8">

          {/* Feature 1 */}
          <div className="bg-white p-8 rounded-2xl shadow hover:shadow-lg transition">
            <FaComments className="text-blue-600 text-4xl mb-4" />
            <h3 className="font-semibold text-xl mb-2">AI Summarized Discussions</h3>
            <p className="text-gray-600">
              Get concise, accurate summaries of long threads to stay informed easily.
            </p>
          </div>

          {/* Feature 2 */}
          <div className="bg-white p-8 rounded-2xl shadow hover:shadow-lg transition">
            <FaCheckCircle className="text-green-600 text-4xl mb-4" />
            <h3 className="font-semibold text-xl mb-2">Point & Vote Validation</h3>
            <p className="text-gray-600">
              Ensure fairness using AI-powered comment assessment and duplication detection.
            </p>
          </div>

          {/* Feature 3 */}
          <div className="bg-white p-8 rounded-2xl shadow hover:shadow-lg transition">
            <FaBrain className="text-purple-600 text-4xl mb-4" />
            <h3 className="font-semibold text-xl mb-2">Smart Content Filtering</h3>
            <p className="text-gray-600">
              Your academic forum stays clean and relevant through AI content moderation.
            </p>
          </div>

        </div>
      </section>

      {/* ===== CALL TO ACTION ===== */}
      <section className="px-6 lg:px-20 py-16 bg-blue-600 text-white text-center">
        <h2 className="text-3xl lg:text-4xl font-bold">
          Start your academic journey with Academiq
        </h2>
        <p className="mt-4 text-lg opacity-90">
          Join thousands of students collaborating and learning smarter.
        </p>

        <Link
          to="/forum"
          className="mt-8 inline-block px-8 py-3 bg-white text-blue-600 font-medium rounded-xl shadow-lg hover:bg-gray-100"
        >
          Enter Forum
        </Link>
      </section>

    </div>
  );
}
