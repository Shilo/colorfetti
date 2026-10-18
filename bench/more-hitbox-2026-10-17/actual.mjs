import { mount } from 'svelte';
import '../../src/foundation.css';
import App from '../../src/App.svelte';
import 'virtual:more-touch-branches.css';
mount(App, { target: document.getElementById('app') });
