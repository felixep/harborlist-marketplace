export default function Safety() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Hero Section */}
      <section className="py-20 bg-gradient-to-r from-red-600 to-orange-600 text-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">
              Boating Safety Tips
            </h1>
            <p className="text-xl text-red-100 mb-8 max-w-3xl mx-auto">
              Stay safe on the water with these essential boating safety guidelines and best practices. 
              Your safety and the safety of your passengers is our top priority.
            </p>
          </div>
        </div>
      </section>

      {/* Essential Safety Tips */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Essential Safety Guidelines
            </h2>
            <p className="text-xl text-slate-600">
              Follow these fundamental safety practices every time you go boating
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">🦺</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Life Jackets</h3>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-start space-x-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Ensure every passenger has a properly fitted life jacket</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Check that life jackets are Coast Guard approved</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Wear life jackets at all times, especially children</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-500 mt-1">•</span>
                  <span>Inspect life jackets regularly for damage</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="w-16 h-16 bg-blue-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">🌤️</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Weather Awareness</h3>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Check weather conditions before departing</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Monitor weather radio while on the water</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Return to shore if conditions deteriorate</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-blue-500 mt-1">•</span>
                  <span>Understand local weather patterns</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">📡</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Communication</h3>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">•</span>
                  <span>Carry a VHF radio for emergency communication</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">•</span>
                  <span>File a float plan with someone on shore</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">•</span>
                  <span>Keep emergency contact numbers accessible</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-green-500 mt-1">•</span>
                  <span>Know how to use distress signals</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="w-16 h-16 bg-purple-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">🧰</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Safety Equipment</h3>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-start space-x-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>Fire extinguishers (properly maintained)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>Sound signaling devices (horn, whistle)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>Visual distress signals (flares, flags)</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-purple-500 mt-1">•</span>
                  <span>First aid kit and emergency supplies</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="w-16 h-16 bg-orange-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">🚫</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Alcohol & Drugs</h3>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-start space-x-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Never operate a boat under the influence</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Designate a sober boat operator</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Understand BUI (Boating Under Influence) laws</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-orange-500 mt-1">•</span>
                  <span>Sun and water intensify alcohol effects</span>
                </li>
              </ul>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <div className="w-16 h-16 bg-cyan-100 rounded-2xl flex items-center justify-center mb-6">
                <span className="text-3xl">⚓</span>
              </div>
              <h3 className="text-2xl font-bold text-slate-900 mb-4">Navigation Rules</h3>
              <ul className="space-y-2 text-slate-600">
                <li className="flex items-start space-x-2">
                  <span className="text-cyan-500 mt-1">•</span>
                  <span>Learn and follow right-of-way rules</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-cyan-500 mt-1">•</span>
                  <span>Maintain proper lookout at all times</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-cyan-500 mt-1">•</span>
                  <span>Operate at safe speeds for conditions</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-cyan-500 mt-1">•</span>
                  <span>Use navigation lights when required</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Emergency Procedures */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Emergency Procedures
            </h2>
            <p className="text-xl text-slate-600">
              Know what to do in emergency situations
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-12">
            <div className="bg-red-50 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-red-900 mb-6">Man Overboard</h3>
              <ol className="space-y-3 text-red-800">
                <li className="flex items-start space-x-3">
                  <span className="bg-red-200 text-red-900 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</span>
                  <span>Immediately throw a flotation device to the person</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="bg-red-200 text-red-900 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</span>
                  <span>Shout "Man Overboard" and point to the person</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="bg-red-200 text-red-900 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</span>
                  <span>Turn the boat around using the quickest safe method</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="bg-red-200 text-red-900 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">4</span>
                  <span>Approach slowly from downwind side</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="bg-red-200 text-red-900 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">5</span>
                  <span>Call for help on VHF Channel 16 if needed</span>
                </li>
              </ol>
            </div>

            <div className="bg-blue-50 rounded-2xl p-8">
              <h3 className="text-2xl font-bold text-blue-900 mb-6">Fire on Board</h3>
              <ol className="space-y-3 text-blue-800">
                <li className="flex items-start space-x-3">
                  <span className="bg-blue-200 text-blue-900 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">1</span>
                  <span>Position boat so fire blows away from boat</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="bg-blue-200 text-blue-900 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">2</span>
                  <span>Shut off fuel supply if possible</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="bg-blue-200 text-blue-900 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">3</span>
                  <span>Use appropriate fire extinguisher</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="bg-blue-200 text-blue-900 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">4</span>
                  <span>Call Coast Guard on VHF Channel 16</span>
                </li>
                <li className="flex items-start space-x-3">
                  <span className="bg-blue-200 text-blue-900 rounded-full w-6 h-6 flex items-center justify-center text-sm font-bold flex-shrink-0 mt-0.5">5</span>
                  <span>Prepare to abandon ship if fire spreads</span>
                </li>
              </ol>
            </div>
          </div>
        </div>
      </section>

      {/* Important Contacts */}
      <section className="py-20 bg-slate-50">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-slate-900 mb-4">
              Emergency Contacts
            </h2>
            <p className="text-xl text-slate-600">
              Keep these numbers readily available
            </p>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Emergency Services</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                  <span className="font-semibold text-red-900">Coast Guard Emergency</span>
                  <span className="font-bold text-red-600">VHF Channel 16</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-red-50 rounded-lg">
                  <span className="font-semibold text-red-900">Emergency (Land)</span>
                  <span className="font-bold text-red-600">911</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-blue-50 rounded-lg">
                  <span className="font-semibold text-blue-900">Coast Guard Non-Emergency</span>
                  <span className="font-bold text-blue-600">(800) 368-5647</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl p-8 shadow-lg">
              <h3 className="text-2xl font-bold text-slate-900 mb-6">Marine Assistance</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                  <span className="font-semibold text-green-900">TowBoatUS</span>
                  <span className="font-bold text-green-600">(800) 391-4869</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                  <span className="font-semibold text-green-900">Sea Tow</span>
                  <span className="font-bold text-green-600">(800) 473-2869</span>
                </div>
                <div className="flex justify-between items-center p-4 bg-purple-50 rounded-lg">
                  <span className="font-semibold text-purple-900">Weather Information</span>
                  <span className="font-bold text-purple-600">VHF WX Channels</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-to-r from-red-600 to-orange-600 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-4xl font-bold mb-6">
            Stay Safe on the Water
          </h2>
          <p className="text-xl text-red-100 mb-8">
            Remember: preparation and knowledge are your best safety tools
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button className="btn-secondary btn-lg">
              <span className="flex items-center space-x-2">
                <span>📚</span>
                <span>Download Safety Checklist</span>
              </span>
            </button>
            <button className="btn-ghost border-white/30 hover:bg-white/10">
              <span className="flex items-center space-x-2">
                <span>🎓</span>
                <span>Find Boating Course</span>
              </span>
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}