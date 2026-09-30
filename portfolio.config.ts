// Edit this file to make the portfolio yours. Nothing else needs to change.
import type { PortfolioConfig } from './src/types.ts'

const config: PortfolioConfig = {
  name: 'Ogulcan Cevik',
  title: 'Software Developer',
  about: `Software developer building web and mobile products end to end. Currently at HubX, based in Izmir.

I've been writing code since 2015 and building products professionally since 2019. I take features from the first screen to production: React and React Native on the front end, Node.js APIs and databases behind them. Lately that has meant building AI-powered web apps at HubX.

I care about fast, accessible interfaces and code the next person can easily pick up. Outside of work, I play drums and guitar, read, and game.`,

  experience: [
    {
      company: 'HubX',
      role: 'Frontend Developer',
      date: 'Present',
      desc: 'Developed and maintained web applications using React and TypeScript. Improved performance and accessibility across the product. Built the web apps for two AI consumer products end to end: PhotoApp, an AI photo enhancer, and MyTunes, an AI music generator.',
      stack: ['React', 'TypeScript', 'Tailwind CSS', 'Next.js', 'Firebase', 'Redux Toolkit', 'Storybook', 'Framer Motion', 'SCSS'],
    },
    {
      company: 'Branchsight',
      role: 'Mobile Developer',
      date: '2024',
      desc: "Built the React Native app for Dijital Bayim, part of Branchsight's location-based marketing platform. The app lets dealers of multi-location brands manage localized Google and Meta campaigns and brand-safe content from their phones.",
      stack: ['React Native', 'Expo', 'TypeScript', 'React Navigation', 'Redux Toolkit'],
    },
    {
      company: 'Assa Technology',
      role: 'Fullstack Developer',
      date: '2023',
      desc: 'Built user-friendly interfaces and contributed to the backend: frontend architecture, website performance, API and server-side features with Node.js/Express.js, and data flows with MongoDB.',
      stack: ['TypeScript', 'JavaScript', 'SCSS', 'Node.js', 'Express.js', 'MongoDB'],
    },
    {
      company: 'Picksoft',
      role: 'Frontend Developer',
      date: '2022',
      desc: 'Built and maintained features for Bubilet, a Turkish ticketing platform for concerts, theatre, festivals, and stand-up shows.',
      stack: ['Angular', 'TypeScript', 'RxJS', 'SCSS'],
    },
    {
      company: 'Digitastic',
      role: 'Frontend Developer',
      date: '2021',
      desc: 'Worked on React and Vue.js projects: state management with Redux, Vuex, and Pinia, OCR and AI-powered frontend features, a custom internal UI framework, and unit tests with Jest.',
      stack: ['React', 'Vue.js', 'Tailwind CSS', 'DevExtreme', 'Redux', 'Vuex', 'Pinia', 'Jest'],
    },
    {
      company: 'Crew Media',
      role: 'Web Developer',
      date: '2020',
      desc: 'Developed responsive, content-driven websites for client projects using PHP, WordPress, and jQuery.',
      stack: ['PHP', 'WordPress', 'jQuery'],
    },
    {
      company: 'Innosa',
      role: 'Software Developer',
      date: '2019',
      desc: 'Developed web applications with .NET MVC and C#, building responsive interfaces and server-side business logic.',
      stack: ['.NET MVC', 'C#', 'HTML', 'CSS', 'JavaScript', 'jQuery'],
    },
    {
      company: 'Dirinler Dokum',
      role: 'Information Technology Intern',
      date: '2016 - 2017',
      desc: 'High school IT internship focused on accounting applications and website development with HTML, CSS, and JavaScript.',
      stack: ['HTML', 'CSS', 'JavaScript'],
    },
  ],

  projects: [
    {
      name: 'PhotoApp Web',
      desc: 'Web app for PhotoApp, an AI photo enhancer. Built end to end at HubX.',
      url: 'https://app.photoapp.org',
      tags: ['React', 'TypeScript', 'Vite'],
    },
    {
      name: 'MyTunes',
      desc: 'AI music generator that turns a text description into a song. Built end to end at HubX.',
      url: 'https://mytunes.ai',
      tags: ['Next.js', 'React', 'TypeScript', 'Tailwind CSS'],
    },
    {
      name: 'Local PDF',
      desc: 'Merge, split, reorder, and rotate PDFs in the browser. Nothing is uploaded, and it works offline.',
      url: 'https://pdf.ogulcancevik.com',
      repo: 'https://github.com/ogulcancevik/local-pdf',
      tags: ['React', 'TypeScript', 'Tailwind CSS', 'pdf-lib', 'pdf.js', 'PWA'],
    },
    {
      name: 'Tic Tac Toe',
      desc: 'Real-time multiplayer tic-tac-toe: create a private room and share the invite link.',
      repo: 'https://github.com/ogulcancevik/tic-tac-toe-online',
      tags: ['React', 'TypeScript', 'Express.js', 'Socket.IO'],
    },
    {
      name: 'Typing Speed Test',
      desc: 'Minimalist typing speed test with real-time metrics.',
      url: 'https://react-typing-speed-test.netlify.app',
      repo: 'https://github.com/ogulcancevik/typing-speed-test',
      tags: ['React', 'TypeScript', 'Tailwind CSS'],
    },
    {
      name: 'Moviet',
      desc: 'Movie app: add movies to your collection and watch trailers.',
      url: 'https://moviet.netlify.app',
      repo: 'https://github.com/ogulcancevik/moviet',
      tags: ['React', 'TypeScript', 'Tailwind CSS', 'Redux'],
    },
  ],

  skills: {
    Languages: ['TypeScript', 'JavaScript', 'C#', 'PHP', 'HTML', 'CSS/SCSS'],
    Frontend: ['React', 'Next.js', 'Vue.js', 'Angular', 'Redux Toolkit', 'Tailwind CSS', 'Framer Motion'],
    Mobile: ['React Native', 'Expo'],
    Backend: ['Node.js', 'Express.js', 'MongoDB', 'Firebase', 'Socket.IO', '.NET MVC'],
    Tools: ['Vite', 'Storybook', 'Jest', 'PWA'],
  },

  links: [
    { label: 'email', url: 'mailto:hello@ogulcancevik.com' },
    { label: 'website', url: 'https://ogulcancevik.com' },
    { label: 'github', url: 'https://github.com/ogulcancevik' },
    { label: 'linkedin', url: 'https://linkedin.com/in/ogulcancevik' },
    { label: 'x', url: 'https://x.com/ogulcancevikk' },
    { label: 'instagram', url: 'https://instagram.com/ogulcan.cevik' },
  ],

  layout: 'window',
  boot: true,
  theme: 'dracula',
  banner: 'OGULCAN CEVIK',
  welcome: 'about',
  user: 'visitor',
  host: 'ogulcan',
}

export default config
