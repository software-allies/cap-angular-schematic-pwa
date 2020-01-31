import { chain, Rule, schematic, SchematicContext, Tree, } from '@angular-devkit/schematics';

export default function (options: any): Rule {
  return (host: Tree, context: SchematicContext) => {
    return chain([
      schematic('schematics-pwa', options)
    ])(host, context);
  };
}