# SCSS

## scss-react per i breakpoint

Repo: https://github.com/DidoMarchet/scss-react

```scss
/* mixins/_utility.scss */
@use 'sass:list';
@use 'sass:string';
@use 'scss-react/dist/index';
@use 'scss-slamp/dist/index';

$react_breakpoints: (
  '<medium':   (max-width: 749px),
  '<large':    (max-width: 999px),
  'landscape': (orientation: landscape),
  'portrait':  (orientation: portrait),
);
```

Uso:
```scss
.component {
  width: 100%;

  @include react('<medium') {
    width: 50%;
  }

  @include react('landscape') {
    height: auto;
  }
}
```

## scss-slamp per le dimensioni fluide

Repo: https://github.com/DidoMarchet/scss-slamp

Scala un valore in modo fluido tra `min` e `max` in base alla larghezza del viewport. Default: root=16px, min-vp=480px, max-vp=1600px.

```scss
font-size:  slamp(18px, 32px);
padding:    slamp(16px, 100px);
margin-top: slamp(40px, 120px);
gap:        slamp(8px, 24px);
```

## Moduli con `@use` e `@forward`

```scss
/* vars/_index.scss */
@forward 'colors';
@forward 'fonts';
@forward 'spacing';
@forward 'timings';

/* mixins/_index.scss */
@forward 'utility';
@forward 'fonts';
@forward 'buttons';
@forward 'links';
@forward 'input';

/* _core.scss, injected globally via Vite additionalData */
@forward 'vars/index';
@forward 'mixins/index';
```

## Sistema di layout

```scss
/* layout/_layout.scss */
%row {
  box-sizing: content-box;
  margin-left: auto;
  margin-right: auto;
}

.row-1 {
  @extend %row;
  padding-left: slamp(16px, 100px);
  padding-right: slamp(16px, 100px);
  max-width: 1600px;

  .row-1 { padding: 0; width: 100%; }  // nested row resets its own padding
}

.row-2 {
  @extend %row;
  padding-left: slamp(16px, 400px);
  padding-right: slamp(16px, 400px);
  max-width: 1170px;
}

.row-3 {
  @extend %row;
  padding-left: slamp(16px, 800px);
  padding-right: slamp(16px, 400px);
  max-width: 700px;
}

.flex { display: flex; align-items: flex-start; }
.flex.--column                { flex-direction: column; }
.flex.--align-center          { align-items: center; }
.flex.--align-right           { align-items: flex-end; }
.flex.--justify-space-between { justify-content: space-between; }
.flex.--justify-center        { justify-content: center; }
.flex.--justify-end           { justify-content: flex-end; }
.flex-1 { flex: 1; }
```

## Tipografia

```scss
/* typo/_heading.scss */
.title-xl { font-size: slamp(40px, 75px); }
.title-l  { font-size: slamp(32px, 60px); }
.title-m  { font-size: slamp(24px, 48px); }
.title-s  { font-size: slamp(18px, 32px); }
```

